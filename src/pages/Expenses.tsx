import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, TrendingUp, TrendingDown } from "lucide-react";

const expenses = [
  {
    id: 1,
    invoice: "INV-2025-001",
    asset: "Forklift FL-002",
    description: "Brake pad replacement",
    amount: 450,
    date: "2025-10-05",
    category: "Repair",
  },
  {
    id: 2,
    invoice: "INV-2025-002",
    asset: "Van V-003",
    description: "Oil change and filter",
    amount: 180,
    date: "2025-10-08",
    category: "Maintenance",
  },
  {
    id: 3,
    invoice: "INV-2025-003",
    asset: "Cold Room CR-A",
    description: "Refrigerant refill",
    amount: 650,
    date: "2025-10-09",
    category: "Repair",
  },
  {
    id: 4,
    invoice: "INV-2025-004",
    asset: "Office Suite A",
    description: "Air filter replacement",
    amount: 120,
    date: "2025-10-10",
    category: "Maintenance",
  },
];

export default function Expenses() {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = totalExpenses / expenses.length;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Expense Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor maintenance costs and invoices</p>
          </div>
          <Button className="bg-gradient-accent shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Invoice
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-md bg-gradient-card border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Total</p>
                  <p className="text-3xl font-bold mt-2">${totalExpenses.toLocaleString()}</p>
                  <p className="text-sm mt-2 font-medium text-success flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    12% from last month
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <DollarSign className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Cost</p>
                  <p className="text-3xl font-bold mt-2">${avgExpense.toFixed(0)}</p>
                  <p className="text-sm mt-2 font-medium text-muted-foreground">Per invoice</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingDown className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <p className="text-3xl font-bold mt-2">{expenses.length}</p>
                  <p className="text-sm mt-2 font-medium text-muted-foreground">This month</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card className="shadow-md bg-gradient-card">
          <CardHeader className="border-b border-border">
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{expense.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        {expense.asset} • {expense.invoice}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{expense.date}</p>
                    </div>
                    <Badge variant="outline">{expense.category}</Badge>
                    <p className="text-lg font-bold text-accent min-w-[100px] text-right">
                      ${expense.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
