import { betterAuth } from "better-auth";
import { createClient, convexAdapter, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import type { GenericDataModel } from "convex/server";
import { components } from "./_generated/api";
import authConfig from "./auth.config";
import { sendEmail } from "./email";

export const authClient = createClient(components.betterAuth);

// Fallback URL for localhost development
const fallbackSiteUrl = process.env.SITE_URL ?? "http://localhost:5173";

// HIPAA: Explicitly allowed origins for CORS
// Update ALLOWED_PRODUCTION_DOMAINS env var for production domains
const ALLOWED_PRODUCTION_DOMAINS = (process.env.ALLOWED_PRODUCTION_DOMAINS || "").split(",").filter(Boolean);

// Check if an origin matches allowed patterns
function isAllowedOrigin(origin: string): boolean {
  // Check explicit production domains first
  if (ALLOWED_PRODUCTION_DOMAINS.includes(origin)) {
    return true;
  }

  // Convex site URL (for auth callbacks)
  if (origin === "https://jovial-wombat-207.convex.site") {
    return true;
  }

  // Production domain
  if (origin === "https://app.noviaclinical.com") {
    return true;
  }

  // Localhost (any port) - development only
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  // WebContainers (dev environments) - development only
  if (process.env.NODE_ENV !== "production" && origin.endsWith(".local-corp.webcontainer-api.io")) {
    return true;
  }

  // HIPAA: Vercel deployments restricted to specific project patterns
  // Only allow the specific project's Vercel domains, not all *.vercel.app
  if (origin.match(/^https:\/\/specode-novia(-[a-z0-9]+)?\.vercel\.app$/)) {
    return true;
  }

  return false;
}

// Get the dynamic site URL from request origin (for crossDomain plugin)
function getDynamicSiteUrl(request?: Request): string {
  const requestOrigin = request?.headers.get("origin");

  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }

  // Fall back to configured site URL
  return fallbackSiteUrl;
}

// Get trusted origins based on the incoming request
function getTrustedOrigins(request?: Request): string[] {
  const origins: string[] = [];

  // Always trust the configured site URL
  if (fallbackSiteUrl) {
    origins.push(fallbackSiteUrl);
  }

  // Explicit additional origins from env (for custom domains in prod)
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const explicit = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map(
      (o) => o.trim()
    );
    origins.push(...explicit);
  }

  // Dynamically trust the request origin if it matches allowed patterns
  const requestOrigin = request?.headers.get("origin");
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    origins.push(requestOrigin);
  }

  return origins;
}

export function createAuth(ctx: GenericCtx<GenericDataModel>, request?: Request) {
  // Use the request origin as siteUrl if it matches allowed patterns
  const siteUrl = getDynamicSiteUrl(request);

  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: convexAdapter(ctx, components.betterAuth),
    trustedOrigins: getTrustedOrigins,
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true, // HIPAA: Email verification required to prevent account impersonation
      minPasswordLength: 8,
      async sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
        console.log("sendVerificationEmail called for:", user.email);
        console.log("Verification URL:", url);
        console.log("RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
        console.log("AUTH_EMAIL set:", !!process.env.AUTH_EMAIL);
        try {
          await sendEmail({
            to: user.email,
            subject: "Verify your email",
            html: `
              <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0f172a; margin-bottom: 12px;">Verify your email</h2>
                <p style="color: #475569; margin-bottom: 16px;">
                  Click the button below to verify your email address:
                </p>
                <a href="${url}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Verify Email
                </a>
                <p style="color: #64748b; margin-top: 16px; font-size: 14px;">
                  If you didn't create an account, you can ignore this email.
                </p>
              </div>
            `,
            debugLabel: "EMAIL VERIFICATION",
          });
        } catch (err) {
          console.error("Failed to send verification email", err);
        }
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          const subject =
            type === "sign-in"
              ? "Your sign-in code"
              : type === "email-verification"
              ? "Verify your email"
              : "Reset your password";

          const title =
            type === "sign-in"
              ? "Sign in code"
              : type === "email-verification"
              ? "Verify your email"
              : "Reset your password";

          try {
            await sendEmail({
              to: email,
              subject,
              html: `
                <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #0f172a; margin-bottom: 12px;">${title}</h2>
                  <p style="color: #475569; margin-bottom: 16px;">
                    Your verification code is:
                  </p>
                  <div style="display: inline-block; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #0f172a; padding: 10px 16px; border-radius: 10px; background: #f1f5f9;">
                    ${otp}
                  </div>
                  <p style="color: #64748b; margin-top: 16px; font-size: 14px;">
                    This code expires in 5 minutes. If you didn't request this, you can ignore this email.
                  </p>
                </div>
              `,
              debugCode: otp,
              debugLabel: title.toUpperCase(),
            });
          } catch (err) {
            console.error("Failed to send OTP email", err);
          }
        },
      }),
      convex({ authConfig }),
      crossDomain({ siteUrl }),
    ],
  });
}
