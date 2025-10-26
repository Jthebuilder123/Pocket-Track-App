import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardPage } from "@/components/dashboard-page";
import Login from "@/pages/login";
import Pricing from "@/pages/pricing";
import ClickTest from "@/pages/click-test";
import NotFound from "@/pages/not-found";
/* FIX: Import click debugger for diagnosing button clickability issues */
import "@/lib/click-debugger";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/login" component={Login} />
      <Route path="/pricing" component={Pricing} />
      {/* FIX: Smoke test page for verifying button clickability */}
      <Route path="/click-test" component={ClickTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
