import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import logger from "./logger";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-in-production";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@pockettrack.app";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5000";

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface MagicLinkPayload {
  email: string;
  type: "magic-link";
}

export interface SessionPayload {
  email: string;
  type: "session";
}

/**
 * Generate a magic link token that expires in 15 minutes
 */
export function generateMagicToken(email: string): string {
  const payload: MagicLinkPayload = {
    email: email.toLowerCase(),
    type: "magic-link",
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

/**
 * Generate a session token that expires in 14 days
 */
export function generateSessionToken(email: string): string {
  const payload: SessionPayload = {
    email: email.toLowerCase(),
    type: "session",
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/**
 * Verify and decode a magic link token
 */
export function verifyMagicToken(token: string): MagicLinkPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MagicLinkPayload;
    if (decoded.type !== "magic-link") {
      return null;
    }
    return decoded;
  } catch (error) {
    logger.error("Invalid magic token", { error });
    return null;
  }
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    if (decoded.type !== "session") {
      return null;
    }
    return decoded;
  } catch (error) {
    logger.error("Invalid session token", { error });
    return null;
  }
}

/**
 * Generic email sending function
 * Returns true if email was sent successfully, false otherwise
 * Never throws - safe to use in critical paths like webhooks
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        to: options.to,
        from: FROM_EMAIL,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      logger.info("Email sent", { to: options.to, subject: options.subject });
      return true;
    } catch (error) {
      logger.error("Failed to send email", { error, to: options.to, subject: options.subject });
      return false;
    }
  } else {
    // Log email to console if SendGrid is not configured
    logger.info("Email (SendGrid not configured)", {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return true; // Consider this a success in dev mode
  }
}

/**
 * Send magic link via email or log it if SendGrid is not configured
 */
export async function sendMagicLink(
  email: string,
  token: string,
  next?: string
): Promise<void> {
  const magicLink = `${APP_BASE_URL}/api/auth/magic?token=${token}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  await sendEmail({
    to: email,
    subject: "Your Magic Link to Sign In",
    text: `Click this link to sign in: ${magicLink}\n\nThis link expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign In to Your Account</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes.</p>
        <a href="${magicLink}" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Sign In
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${magicLink}</code>
        </p>
      </div>
    `,
  });
}
