import { betterAuth } from "better-auth";
import { createClient, convexAdapter, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import type { GenericDataModel } from "convex/server";
import { components } from "./_generated/api";
import authConfig from "./auth.config";
import { sendEmail } from "./email";

export const authClient = createClient(components.betterAuth);

// Frontend URL - defaults to localhost for dev
const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";

// Get trusted origins based on the incoming request
function getTrustedOrigins(request?: Request): string[] {
  const origins: string[] = [];

  // Always trust the configured site URL
  if (siteUrl) {
    origins.push(siteUrl);
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
  if (requestOrigin) {
    // Localhost (any port)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
      origins.push(requestOrigin);
    }
    // WebContainers (dev environments)
    else if (requestOrigin.endsWith(".local-corp.webcontainer-api.io")) {
      origins.push(requestOrigin);
    }
    // Vercel deployments (previews + production)
    else if (requestOrigin.endsWith(".vercel.app")) {
      origins.push(requestOrigin);
    }
  }

  return origins;
}

export function createAuth(ctx: GenericCtx<GenericDataModel>) {
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
      requireEmailVerification: false,
      minPasswordLength: 8,
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

          void sendEmail({
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
          }).catch((err) => {
            console.error("Failed to send OTP email", err);
          });
        },
      }),
      convex({ authConfig }),
      crossDomain({ siteUrl }),
    ],
  });
}
