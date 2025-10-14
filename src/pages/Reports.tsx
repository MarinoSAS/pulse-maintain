import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { BarChart3, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AIInsights } from "@/components/AIInsights";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  company: string;
  asset_id: string;
};

type DatePreset = "last30" | "last3months" | "lastYear" | "thisYear" | "custom";

export default function Reports() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("last3months");
  const [companies, setCompanies] = useState<string[]>(["Unifruit", "Limnia", "HRC", "Other"]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [chartPreferences, setChartPreferences] = useState({
    expensesOverTime: true,
    companyComparison: true,
    categoryBreakdown: true,
    periodComparison: false,
    aiInsights: true
  });

  useEffect(() => {
    const saved = localStorage.getItem('reportChartPreferences');
    if (saved) {
      setChartPreferences(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadExpenses();
    }
  }, [isAdmin, datePreset]);

  const updatePreference = (chart: string, visible: boolean) => {
    const updated = { ...chartPreferences, [chart]: visible };
    setChartPreferences(updated);
    localStorage.setItem('reportChartPreferences', JSON.stringify(updated));
  };

  const getDateRange = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (datePreset) {
      case "last30":
        end = now;
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "last3months":
        end = now;
        start = subMonths(now, 3);
        break;
      case "lastYear":
        end = now;
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "thisYear":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = subMonths(now, 3);
        end = now;
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (error) throw error;
      
      setExpenses(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(e => e.category) || [])];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    return (companies.length === 0 || companies.includes(e.company)) &&
           (categories.length === 0 || categories.includes(e.category));
  });

  // Expenses Over Time Data
  const timeSeriesData = filteredExpenses.reduce((acc, expense) => {
    const month = format(new Date(expense.date), 'MMM yyyy');
    const existing = acc.find(item => item.month === month);
    
    if (existing) {
      existing.total += expense.amount;
      existing[expense.company] = (existing[expense.company] || 0) + expense.amount;
    } else {
      acc.push({
        month,
        total: expense.amount,
        [expense.company]: expense.amount
      });
    }
    
    return acc;
  }, [] as any[]);

  // Company Comparison Data
  const companyData = Object.entries(
    filteredExpenses.reduce((acc, e) => {
      acc[e.company] = (acc[e.company] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([company, total]) => ({
    company,
    total,
    count: filteredExpenses.filter(e => e.company === company).length
  }));

  // Category Breakdown Data
  const categoryData = Object.entries(
    filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, amount]) => ({
    category,
    amount,
    percentage: (amount / filteredExpenses.reduce((sum, e) => sum + e.amount, 0)) * 100
  }));

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredExpenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    
    const summaryData = [
      { Metric: "Total Expenses", Value: `$${totalExpenses.toFixed(2)}` },
      { Metric: "Number of Expenses", Value: filteredExpenses.length },
      { Metric: "Average Expense", Value: `$${avgExpense.toFixed(2)}` },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    
    XLSX.writeFile(workbook, `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Report exported to Excel successfully");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Maintenance Expense Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Period: ${datePreset}`, 14, 34);
    
    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Expenses', `$${totalExpenses.toLocaleString()}`],
        ['Number of Expenses', filteredExpenses.length.toString()],
        ['Average Expense', `$${avgExpense.toFixed(2)}`],
      ],
    });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Description', 'Company', 'Category', 'Amount']],
      body: filteredExpenses.map(e => [
        e.date,
        e.description || '-',
        e.company,
        e.category,
        `$${e.amount.toFixed(2)}`
      ]),
    });
    
    doc.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report generated successfully");
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    toast.error("Access denied. Admin privileges required.");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Comprehensive expense analysis with AI insights</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Date Range</Label>
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last3months">Last 3 Months</SelectItem>
                    <SelectItem value="lastYear">Last Year</SelectItem>
                    <SelectItem value="thisYear">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Visible Charts</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expensesOverTime"
                    checked={chartPreferences.expensesOverTime}
                    onCheckedChange={(checked) => updatePreference('expensesOverTime', checked as boolean)}
                  />
                  <Label htmlFor="expensesOverTime" className="cursor-pointer">Expenses Over Time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="companyComparison"
                    checked={chartPreferences.companyComparison}
                    onCheckedChange={(checked) => updatePreference('companyComparison', checked as boolean)}
                  />
                  <Label htmlFor="companyComparison" className="cursor-pointer">Company Comparison</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="categoryBreakdown"
                    checked={chartPreferences.categoryBreakdown}
                    onCheckedChange={(checked) => updatePreference('categoryBreakdown', checked as boolean)}
                  />
                  <Label htmlFor="categoryBreakdown" className="cursor-pointer">Category Breakdown</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aiInsights"
                    checked={chartPreferences.aiInsights}
                    onCheckedChange={(checked) => updatePreference('aiInsights', checked as boolean)}
                  />
                  <Label htmlFor="aiInsights" className="cursor-pointer">AI Insights</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartPreferences.expensesOverTime && (
              <Card>
                <CardHeader>
                  <CardTitle>Expenses Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartPreferences.companyComparison && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={companyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartPreferences.categoryBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.category}: $${entry.amount.toFixed(0)}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartPreferences.aiInsights && (
              <AIInsights expenses={filteredExpenses} dateRange={getDateRange()} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
