import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Loader2, X } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Get error from URL if redirected from failed auth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error) {
      toast({
        title: "Authentication Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      // Clear error from URL
      window.history.replaceState({}, "", "/login");
    }
  }, [toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = () => {
    // Redirect to Replit Auth login (supports Google OAuth + Email/Password)
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={() => setLocation("/")}
          data-testid="button-close-login"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to PocketTrack</CardTitle>
          <CardDescription>
            Track and manage your subscriptions with ease
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
            data-testid="button-login"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign In
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Sign in with Google, GitHub, or email/password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
