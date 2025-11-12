import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardPage } from "@/components/dashboard-page";
import Login from "@/pages/login";
import Pricing from "@/pages/pricing";
import Settings from "@/pages/settings";
import ClickTest from "@/pages/click-test";
import Privacy from "@/pages/privacy";
import Support from "@/pages/support";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import logoSplash from "@/assets/logo-splash.png";
/* FIX: Import click debugger for diagnosing button clickability issues */
import "@/lib/click-debugger";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <img src={logoSplash} alt="PocketTrack" className="h-32 w-auto" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guest mode enabled: Dashboard is accessible to everyone
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/login" component={Login} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/settings" component={Settings} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/support" component={Support} />
      <Route path="/click-test" component={ClickTest} />
      {/* FIX: Use wouter Redirect for catch-all to prevent hard page reloads that cause flickering */}
      <Route>
        <Redirect to="/" />
      </Route>
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
