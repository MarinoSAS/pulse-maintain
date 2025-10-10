-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'technician');

-- Create enum for asset categories
CREATE TYPE public.asset_category AS ENUM ('Vehicles', 'Equipment', 'Tools', 'Facilities');

-- Create enum for asset status
CREATE TYPE public.asset_status AS ENUM ('Active', 'Maintenance', 'Inactive');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('To Do', 'In Progress', 'Done');

-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  active_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category asset_category NOT NULL,
  status asset_status NOT NULL DEFAULT 'Active',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  last_service DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'To Do',
  priority task_priority NOT NULL DEFAULT 'Medium',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create maintenance_schedules table
CREATE TABLE public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  maintenance_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  invoice_number TEXT,
  vendor TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for team_members
CREATE POLICY "Anyone authenticated can view team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

-- RLS Policies for assets
CREATE POLICY "Anyone authenticated can view assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can manage assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins and supervisors can update assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins can delete assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tasks
CREATE POLICY "Anyone authenticated can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

-- RLS Policies for maintenance_schedules
CREATE POLICY "Anyone authenticated can view maintenance schedules"
  ON public.maintenance_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can create maintenance schedules"
  ON public.maintenance_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update maintenance schedules"
  ON public.maintenance_schedules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete maintenance schedules"
  ON public.maintenance_schedules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for expenses
CREATE POLICY "Anyone authenticated can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can manage expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins and supervisors can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();