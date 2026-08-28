export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      asset_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          assigned_to: string | null
          category: string
          company: Database["public"]["Enums"]["company_name"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_maintenance_date: string | null
          last_maintenance_odometer: number | null
          last_service: string | null
          maintenance_interval_days: number | null
          maintenance_interval_km: number | null
          name: string
          odometer_reading: number | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          assigned_to?: string | null
          category: string
          company?: Database["public"]["Enums"]["company_name"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_odometer?: number | null
          last_service?: string | null
          maintenance_interval_days?: number | null
          maintenance_interval_km?: number | null
          name: string
          odometer_reading?: number | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          assigned_to?: string | null
          category?: string
          company?: Database["public"]["Enums"]["company_name"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_odometer?: number | null
          last_service?: string | null
          maintenance_interval_days?: number | null
          maintenance_interval_km?: number | null
          name?: string
          odometer_reading?: number | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assets_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      category_maintenance_types: {
        Row: {
          asset_category_id: string | null
          created_at: string | null
          id: string
          maintenance_type_id: string | null
        }
        Insert: {
          asset_category_id?: string | null
          created_at?: string | null
          id?: string
          maintenance_type_id?: string | null
        }
        Update: {
          asset_category_id?: string | null
          created_at?: string | null
          id?: string
          maintenance_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_maintenance_types_asset_category_id_fkey"
            columns: ["asset_category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_maintenance_types_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          asset_id: string
          category: string
          company: Database["public"]["Enums"]["company_name"] | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          invoice_file_path: string | null
          invoice_number: string | null
          maintenance_category:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          next_service_interval_days: number | null
          next_service_interval_km: number | null
          odometer_at_service: number | null
          requirement_id: string | null
          updated_at: string
          vendor: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          asset_id: string
          category: string
          company?: Database["public"]["Enums"]["company_name"] | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          invoice_file_path?: string | null
          invoice_number?: string | null
          maintenance_category?:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          next_service_interval_days?: number | null
          next_service_interval_km?: number | null
          odometer_at_service?: number | null
          requirement_id?: string | null
          updated_at?: string
          vendor?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          category?: string
          company?: Database["public"]["Enums"]["company_name"] | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_file_path?: string | null
          invoice_number?: string | null
          maintenance_category?:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          next_service_interval_days?: number | null
          next_service_interval_km?: number | null
          odometer_at_service?: number | null
          requirement_id?: string | null
          updated_at?: string
          vendor?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          asset_id: string
          company: string
          cost: number | null
          created_at: string | null
          created_by: string | null
          id: string
          liters: number
          month_year: string
          notes: string | null
          record_date: string
          record_time: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          company: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          liters: number
          month_year: string
          notes?: string | null
          record_date: string
          record_time?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          company?: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          liters?: number
          month_year?: string
          notes?: string | null
          record_date?: string
          record_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invitee_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invitee_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invitee_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      maintenance_requirements: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          interval_days: number | null
          interval_km: number | null
          last_completed_at: string | null
          last_completed_odometer: number | null
          last_expense_id: string | null
          maintenance_type: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          last_completed_at?: string | null
          last_completed_odometer?: number | null
          last_expense_id?: string | null
          maintenance_type: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          last_completed_at?: string | null
          last_completed_odometer?: number | null
          last_expense_id?: string | null
          maintenance_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requirements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requirements_last_expense_id_fkey"
            columns: ["last_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          asset_id: string
          auto_generated: boolean | null
          completed: boolean | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          due_by_date: string | null
          due_by_odometer: number | null
          id: string
          maintenance_category:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          maintenance_type: string
          notes: string | null
          scheduled_date: string
          source_expense_id: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          auto_generated?: boolean | null
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          due_by_date?: string | null
          due_by_odometer?: number | null
          id?: string
          maintenance_category?:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          maintenance_type: string
          notes?: string | null
          scheduled_date: string
          source_expense_id?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          auto_generated?: boolean | null
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          due_by_date?: string | null
          due_by_odometer?: number | null
          id?: string
          maintenance_category?:
            | Database["public"]["Enums"]["maintenance_type_enum"]
            | null
          maintenance_type?: string
          notes?: string | null
          scheduled_date?: string
          source_expense_id?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_source_expense_id_fkey"
            columns: ["source_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          invitation_accepted: boolean | null
          invitation_token: string | null
          invited_at: string | null
          invited_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          invitation_accepted?: boolean | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          invitation_accepted?: boolean | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          approximate_cost: number | null
          asset_id: string | null
          assigned_team_members: string[] | null
          assigned_to: string | null
          assigned_vendors: string[] | null
          company: Database["public"]["Enums"]["company_name"] | null
          completion_comments: string | null
          completion_confirmed_at: string | null
          completion_confirmed_by: string | null
          completion_status:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_issue_report: boolean | null
          maintenance_type: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          rejection_reason: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approximate_cost?: number | null
          asset_id?: string | null
          assigned_team_members?: string[] | null
          assigned_to?: string | null
          assigned_vendors?: string[] | null
          company?: Database["public"]["Enums"]["company_name"] | null
          completion_comments?: string | null
          completion_confirmed_at?: string | null
          completion_confirmed_by?: string | null
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_issue_report?: boolean | null
          maintenance_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approximate_cost?: number | null
          asset_id?: string | null
          assigned_team_members?: string[] | null
          assigned_to?: string | null
          assigned_vendors?: string[] | null
          company?: Database["public"]["Enums"]["company_name"] | null
          completion_comments?: string | null
          completion_confirmed_at?: string | null
          completion_confirmed_by?: string | null
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_issue_report?: boolean | null
          maintenance_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active_tasks: number | null
          completed_tasks: number | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          initials: string
          name: string
          phone: string | null
          phone_number: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_tasks?: number | null
          completed_tasks?: number | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          initials: string
          name: string
          phone?: string | null
          phone_number?: string | null
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_tasks?: number | null
          completed_tasks?: number | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          initials?: string
          name?: string
          phone?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          updated_at: string
          vendor_type_id: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          vendor_type_id?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          vendor_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_vendor_type_id_fkey"
            columns: ["vendor_type_id"]
            isOneToOne: false
            referencedRelation: "vendor_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "technician" | "manager"
      asset_status: "Active" | "Maintenance" | "Inactive"
      company_name: "Unifruit" | "Limnia" | "HRC" | "Other"
      completion_status: "pending_confirmation" | "confirmed"
      maintenance_type_enum:
        | "Service"
        | "Oil Change"
        | "MOT"
        | "Tachograph"
        | "Speed Limiter"
        | "Repair"
      task_priority: "Low" | "Medium" | "High" | "Urgent"
      task_status: "To Do" | "In Progress" | "Done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "technician", "manager"],
      asset_status: ["Active", "Maintenance", "Inactive"],
      company_name: ["Unifruit", "Limnia", "HRC", "Other"],
      completion_status: ["pending_confirmation", "confirmed"],
      maintenance_type_enum: [
        "Service",
        "Oil Change",
        "MOT",
        "Tachograph",
        "Speed Limiter",
        "Repair",
      ],
      task_priority: ["Low", "Medium", "High", "Urgent"],
      task_status: ["To Do", "In Progress", "Done"],
    },
  },
} as const
