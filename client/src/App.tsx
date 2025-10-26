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
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
/* FIX: Import click debugger for diagnosing button clickability issues */
import "@/lib/click-debugger";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route path="/" component={Login} />
          <Route component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={DashboardPage} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/click-test" component={ClickTest} />
          {/* FIX: Use proper wouter catch-all syntax - routes without path match everything not matched above */}
          <Route>
            {() => {
              window.location.replace('/');
              return null;
            }}
          </Route>
        </>
      )}
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
