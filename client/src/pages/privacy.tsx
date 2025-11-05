import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: November 5, 2025</p>

          <section>
            <h2>Introduction</h2>
            <p>
              PocketTrack ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our subscription tracking application.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            
            <h3>Personal Information</h3>
            <p>We collect information that you provide directly to us when you:</p>
            <ul>
              <li>Create an account (email, name, profile information)</li>
              <li>Add subscription details (service names, costs, billing dates)</li>
              <li>Connect your bank accounts via Plaid</li>
              <li>Upload bank statements</li>
              <li>Make payments for premium features</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <p>When you use PocketTrack, we automatically collect:</p>
            <ul>
              <li>Device information (browser type, operating system, device identifiers)</li>
              <li>Usage data (features used, time spent, interactions)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3>Financial Information</h3>
            <p>
              We use Plaid to connect to your bank accounts. When you connect a bank account, Plaid collects your banking credentials and transaction data. We receive transaction information from Plaid but never have access to your banking credentials. Bank connection data includes:
            </p>
            <ul>
              <li>Transaction history</li>
              <li>Account balances</li>
              <li>Account holder information</li>
              <li>Recurring payment patterns</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Provide, operate, and maintain our services</li>
              <li>Track and analyze your subscription spending</li>
              <li>Identify recurring charges from your bank statements</li>
              <li>Send payment reminders and renewal notifications</li>
              <li>Process payments for premium features</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you about updates and features</li>
              <li>Detect and prevent fraud or security issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>We use the following third-party service providers:</p>
            
            <h3>Plaid</h3>
            <p>
              For secure bank account connections and transaction data. Plaid's privacy policy is available at{" "}
              <a href="https://plaid.com/legal/#privacy-policy" target="_blank" rel="noopener noreferrer">
                plaid.com/legal
              </a>
            </p>

            <h3>Stripe</h3>
            <p>
              For payment processing of premium subscriptions. Stripe's privacy policy is available at{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                stripe.com/privacy
              </a>
            </p>

            <h3>Replit Auth</h3>
            <p>
              For user authentication and account management. Replit's privacy policy is available at{" "}
              <a href="https://replit.com/site/privacy" target="_blank" rel="noopener noreferrer">
                replit.com/site/privacy
              </a>
            </p>
          </section>

          <section>
            <h2>Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> With third parties who perform services on our behalf (Plaid, Stripe, hosting providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or legal process</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
          </section>

          <section>
            <h2>Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication via Replit Auth</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal data by employees</li>
              <li>Secure integration with Plaid (we never store your bank credentials)</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2>Your Privacy Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, contact us at the information provided below.
            </p>
          </section>

          <section>
            <h2>Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember your preferences, and analyze usage patterns. You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features.
            </p>
          </section>

          <section>
            <h2>Children's Privacy</h2>
            <p>
              PocketTrack is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2>International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using PocketTrack, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of PocketTrack after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@pockettrack.app">privacy@pockettrack.app</a>
            </p>
            <p>
              <strong>Support:</strong>{" "}
              <Link href="/support" className="text-primary hover:underline">
                Visit our Support page
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
