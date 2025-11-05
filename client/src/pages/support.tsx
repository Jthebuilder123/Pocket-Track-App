import { Link } from "wouter";
import { ArrowLeft, Mail, MessageCircle, HelpCircle, FileText, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Support Center</h1>
            <p className="text-muted-foreground">
              Get help with PocketTrack - your subscription management companion
            </p>
          </div>

          {/* Contact Options */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Get a response within 24-48 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:support@pockettrack.app"
                  className="text-primary hover:underline"
                  data-testid="link-email-support"
                >
                  support@pockettrack.app
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Feature Requests
                </CardTitle>
                <CardDescription>
                  Suggest new features or improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:feedback@pockettrack.app"
                  className="text-primary hover:underline"
                  data-testid="link-feedback"
                >
                  feedback@pockettrack.app
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/pricing" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-pricing">
                <CreditCard className="w-4 h-4" />
                View Pricing & Plans
              </Link>
              <Link href="/privacy" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-privacy">
                <FileText className="w-4 h-4" />
                Privacy Policy
              </Link>
            </CardContent>
          </Card>

          {/* FAQs */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <HelpCircle className="w-6 h-6" />
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="space-y-2">
              {/* General Questions */}
              <AccordionItem value="what-is-pockettrack">
                <AccordionTrigger data-testid="faq-what-is-pockettrack">
                  What is PocketTrack?
                </AccordionTrigger>
                <AccordionContent>
                  PocketTrack is a subscription management application that helps you track, manage, and optimize your recurring expenses. Connect your bank accounts to automatically detect subscriptions, or manually add them to keep everything in one place.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pricing-plans">
                <AccordionTrigger data-testid="faq-pricing-plans">
                  What are the different pricing plans?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Free:</strong> Up to 10 subscriptions, 1 bank connection, basic features</li>
                    <li><strong>Essentials ($4.99/month):</strong> Up to 25 subscriptions, 3 bank connections, export features</li>
                    <li><strong>Pro ($9.99/month):</strong> Unlimited subscriptions and bank connections, webhooks, auto-sync, priority support</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* Bank Connection Questions */}
              <AccordionItem value="bank-connection">
                <AccordionTrigger data-testid="faq-bank-connection" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  How do I connect my bank account?
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Click "Connect Bank" on your dashboard</li>
                    <li>Select your bank from the list</li>
                    <li>Enter your banking credentials securely via Plaid</li>
                    <li>Grant permission for PocketTrack to read your transactions</li>
                    <li>We'll automatically detect recurring charges and suggest subscriptions</li>
                  </ol>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Note: We use Plaid for secure bank connections. We never see or store your banking credentials.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bank-security">
                <AccordionTrigger data-testid="faq-bank-security">
                  Is my bank connection secure?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! We use Plaid, a trusted financial services platform used by major apps like Venmo and Robinhood. Your bank credentials are encrypted and never stored on our servers. We only receive read-only access to your transaction history to identify recurring charges.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="disconnect-bank">
                <AccordionTrigger data-testid="faq-disconnect-bank">
                  How do I disconnect a bank account?
                </AccordionTrigger>
                <AccordionContent>
                  Navigate to your dashboard, find the connected bank in your bank connections list, and click "Disconnect" or the trash icon. This will immediately revoke PocketTrack's access to your bank data.
                </AccordionContent>
              </AccordionItem>

              {/* Subscription Management */}
              <AccordionItem value="add-subscription">
                <AccordionTrigger data-testid="faq-add-subscription">
                  How do I add a subscription?
                </AccordionTrigger>
                <AccordionContent>
                  You can add subscriptions in two ways:
                  <ol className="list-decimal pl-5 space-y-1 mt-2">
                    <li><strong>Automatically:</strong> Connect your bank account and we'll detect recurring charges</li>
                    <li><strong>Manually:</strong> Click "Add Subscription", enter the service name, cost, billing frequency, and next billing date</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="edit-subscription">
                <AccordionTrigger data-testid="faq-edit-subscription">
                  Can I edit or delete subscriptions?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Click on any subscription to view details, then use the "Edit" button to update information or "Delete" to remove it from your tracking list.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel-subscription">
                <AccordionTrigger data-testid="faq-cancel-subscription">
                  How do I cancel a subscription service?
                </AccordionTrigger>
                <AccordionContent>
                  PocketTrack helps you track subscriptions, but to cancel them you'll need to contact the service provider directly. We provide helpful cancellation links and resources for common services when you view subscription details.
                </AccordionContent>
              </AccordionItem>

              {/* Data & Export */}
              <AccordionItem value="export-data">
                <AccordionTrigger data-testid="faq-export-data">
                  Can I export my subscription data?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Essentials and Pro plan users can export their subscription data in CSV or JSON format. This is useful for analysis, backups, or migrating to another tool.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bank-statement-import">
                <AccordionTrigger data-testid="faq-bank-statement-import">
                  Can I upload bank statements instead of connecting my bank?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! If you prefer not to connect your bank account, you can upload bank statements (PDF, CSV, or Excel) and we'll scan them for recurring charges to suggest subscriptions.
                </AccordionContent>
              </AccordionItem>

              {/* Account & Billing */}
              <AccordionItem value="upgrade-plan">
                <AccordionTrigger data-testid="faq-upgrade-plan">
                  How do I upgrade my plan?
                </AccordionTrigger>
                <AccordionContent>
                  Visit the Pricing page and select the plan you want. You'll be redirected to Stripe for secure payment processing. Your upgrade takes effect immediately.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel-plan">
                <AccordionTrigger data-testid="faq-cancel-plan">
                  How do I cancel my paid plan?
                </AccordionTrigger>
                <AccordionContent>
                  Contact us at support@pockettrack.app to cancel your subscription. You'll retain access to paid features until the end of your current billing period, then automatically downgrade to the Free plan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-account">
                <AccordionTrigger data-testid="faq-delete-account">
                  How do I delete my account?
                </AccordionTrigger>
                <AccordionContent>
                  To delete your account and all associated data, email us at support@pockettrack.app with your request. We'll process the deletion within 30 days in accordance with our privacy policy.
                </AccordionContent>
              </AccordionItem>

              {/* Technical Issues */}
              <AccordionItem value="mobile-app">
                <AccordionTrigger data-testid="faq-mobile-app">
                  Is there a mobile app?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! PocketTrack is available as a Progressive Web App (PWA) that works on any device, and we also have native iOS and Android apps available on the App Store and Google Play.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sync-issues">
                <AccordionTrigger data-testid="faq-sync-issues">
                  My bank transactions aren't syncing. What should I do?
                </AccordionTrigger>
                <AccordionContent>
                  Try these steps:
                  <ol className="list-decimal pl-5 space-y-1 mt-2">
                    <li>Check that your bank connection is still active</li>
                    <li>Try disconnecting and reconnecting your bank</li>
                    <li>Ensure your bank hasn't changed security settings that might block Plaid</li>
                    <li>Pro plan users: Check your auto-sync settings</li>
                  </ol>
                  <p className="mt-2">If issues persist, contact support@pockettrack.app</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="webhooks">
                <AccordionTrigger data-testid="faq-webhooks">
                  What are webhooks and how do I use them?
                </AccordionTrigger>
                <AccordionContent>
                  Webhooks (Pro plan only) allow PocketTrack to send real-time notifications to other apps or services when subscriptions are added, updated, or about to renew. This is useful for integrating with automation tools like Zapier or custom applications.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Still Need Help */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Still Need Help?</CardTitle>
              <CardDescription>
                Can't find what you're looking for? We're here to help!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Email us at{" "}
                <a href="mailto:support@pockettrack.app" className="text-primary hover:underline">
                  support@pockettrack.app
                </a>
                {" "}and we'll get back to you within 24-48 hours.
              </p>
              <p className="text-sm text-muted-foreground">
                Pro plan users receive priority support with faster response times.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
