import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Mail, Phone, Shield, Copy, Check, Users, CheckCircle2, Clock, Trash2, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const invitationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "manager"]),
  description: z.string().optional(),
});

type Invitation = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  accepted: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  active_tasks: number;
  completed_tasks: number;
  created_at: string;
  actual_role?: 'admin' | 'manager' | null;
};

export default function Team() {
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [inviteLink, setInviteLink] = useState<string>("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("members");

  const form = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      name: "",
      role: "manager",
      description: "",
    },
  });

  useEffect(() => {
    loadInvitations();
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          user_roles(role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map the data to include actual_role from user_roles
      const membersWithRoles = (data || []).map((member: any) => ({
        ...member,
        actual_role: (member.user_roles?.role || null) as 'admin' | 'manager' | null
      }));
      
      setTeamMembers(membersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load team members");
    }
  };

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof invitationSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a random token
      const token = crypto.randomUUID();

      const { error } = await supabase.from("invitations").insert({
        invitee_name: values.name,
        role: values.role,
        token,
        invited_by: user.id,
      });

      if (error) throw error;

      // Generate invite link
      const link = `${window.location.origin}/accept-invitation?token=${token}`;
      setInviteLink(link);
      
      form.reset();
      setOpen(false);
      setShowLinkDialog(true);
      loadInvitations();
      loadTeamMembers();
      setActiveTab("invitations");
    } catch (error: any) {
      toast.error(error.message || "Failed to create invitation");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteTeamMember = async (id: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prevent admin from deleting themselves
      if (user?.id === id) {
        toast.error("You cannot delete your own account");
        return;
      }

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`${name} removed from team`);
      loadTeamMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team member");
    }
  };

  const getRoleBadge = (actualRole: 'admin' | 'manager' | null) => {
    if (actualRole === 'admin') {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }
    if (actualRole === 'manager') {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/30">
          <User className="w-3 h-3 mr-1" />
          Manager
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        No Role
      </Badge>
    );
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can manage team members.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">Manage your team members and invitations</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an invitation to join your team.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior Technician, 10 years experience" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-accent">
                      Send Invitation
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No team members yet. Invite your first team member using the button above.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member) => (
                  <Card key={member.id} className="shadow-md bg-gradient-card hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleBadge(member.actual_role)}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {member.name} from the team. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteTeamMember(member.id, member.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {member.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {member.description}
                        </p>
                      )}

                      {(member.email || member.phone) && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {member.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate text-muted-foreground">{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="text-sm font-medium text-foreground">
                            {member.active_tasks || 0}
                          </span>
                          <span className="text-xs text-muted-foreground">active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-foreground">
                            {member.completed_tasks || 0}
                          </span>
                          <span className="text-xs text-muted-foreground">completed</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No invitations sent yet. Invite your first team member using the button above.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} className="shadow-md bg-gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Mail className="w-6 h-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {invitation.accepted ? (
                              <span className="text-success">Accepted</span>
                            ) : (
                              <span className="text-warning">Pending</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invitation Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Link Created!</DialogTitle>
            <DialogDescription>
              Share this link with the team member to accept their invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono break-all">{inviteLink}</p>
            </div>
            <Button 
              onClick={copyToClipboard} 
              className="w-full bg-gradient-accent"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can share this link via WhatsApp, email, SMS, or any messaging app.
              The invitation expires in 7 days.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
