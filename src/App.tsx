import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import NewAsset from "./pages/NewAsset";
import Tasks from "./pages/Tasks";
import TaskApprovals from "./pages/TaskApprovals";
import Maintenance from "./pages/Maintenance";
import Expenses from "./pages/Expenses";
import NewExpense from "./pages/NewExpense";
import Vendors from "./pages/Vendors";
import NewVendor from "./pages/NewVendor";
import VendorDetail from "./pages/VendorDetail";
import Team from "./pages/Team";
import Auth from "./pages/Auth";
import AcceptInvitation from "./pages/AcceptInvitation";
import AssetApprovals from "./pages/AssetApprovals";
import VendorApprovals from "./pages/VendorApprovals";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/assets/new" element={<NewAsset />} />
          <Route path="/assets/approvals" element={<AssetApprovals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/approvals" element={<TaskApprovals />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expenses/new" element={<NewExpense />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/new" element={<NewVendor />} />
          <Route path="/vendors/:id" element={<VendorDetail />} />
          <Route path="/vendors/approvals" element={<VendorApprovals />} />
          <Route path="/team" element={<Team />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
