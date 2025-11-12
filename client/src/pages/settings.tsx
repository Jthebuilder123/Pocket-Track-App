// APPSTORE: Settings page with Account Deletion (Guideline 5.1.1 v)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);

  // APPSTORE: Account deletion mutation (Guideline 5.1.1 v)
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
      // Redirect to login after brief delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
      setShowDialog(false);
    },
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-8" data-testid="text-settings-title">Settings</h1>

      <div className="space-y-6">
        {/* Account Management Section */}
        <Card data-testid="card-account-management">
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>
              Manage your account settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* APPSTORE: Account Deletion (Guideline 5.1.1 v) */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={deleteAccountMutation.isPending}
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-confirm-delete">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        This action will permanently delete your account and all associated data, including:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All subscription records</li>
                        <li>Subscription history and audit trail</li>
                        <li>Bank connection data</li>
                        <li>Detected subscriptions from bank imports</li>
                        <li>Payment history</li>
                        <li>User preferences and notification settings</li>
                        <li>Active subscriptions (Essentials/Pro)</li>
                      </ul>
                      <p className="font-semibold text-destructive mt-4">
                        This action cannot be undone.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteAccountMutation.isPending} data-testid="button-cancel-delete">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                      className="bg-destructive hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      {deleteAccountMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings Sections can go here */}
        <Card data-testid="card-support">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              If you're experiencing issues or have questions before deleting your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => navigate("/support")}
              data-testid="button-contact-support"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
