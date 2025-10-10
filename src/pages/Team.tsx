import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone } from "lucide-react";

const teamMembers = [
  {
    id: 1,
    name: "John Smith",
    initials: "JS",
    role: "Senior Technician",
    email: "john.smith@company.com",
    phone: "+1 (555) 123-4567",
    activeTasks: 3,
    completedTasks: 28,
  },
  {
    id: 2,
    name: "Sarah Jones",
    initials: "SJ",
    role: "Maintenance Supervisor",
    email: "sarah.jones@company.com",
    phone: "+1 (555) 234-5678",
    activeTasks: 2,
    completedTasks: 45,
  },
  {
    id: 3,
    name: "Mike Johnson",
    initials: "MJ",
    role: "Technician",
    email: "mike.johnson@company.com",
    phone: "+1 (555) 345-6789",
    activeTasks: 4,
    completedTasks: 22,
  },
  {
    id: 4,
    name: "Emily Brown",
    initials: "EB",
    role: "Equipment Specialist",
    email: "emily.brown@company.com",
    phone: "+1 (555) 456-7890",
    activeTasks: 2,
    completedTasks: 31,
  },
  {
    id: 5,
    name: "David Lee",
    initials: "DL",
    role: "HVAC Technician",
    email: "david.lee@company.com",
    phone: "+1 (555) 567-8901",
    activeTasks: 1,
    completedTasks: 19,
  },
];

export default function Team() {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage your maintenance team</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <Card key={member.id} className="shadow-md bg-gradient-card hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Tasks</p>
                    <p className="text-xl font-bold text-warning">{member.activeTasks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold text-success">{member.completedTasks}</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
