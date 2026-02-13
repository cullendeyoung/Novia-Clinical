import { Resend } from "resend";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  debugCode?: string;
  debugLabel?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  debugCode,
  debugLabel,
}: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.AUTH_EMAIL;
  const label = debugLabel ?? "PASSWORD RESET";
  const linkMatch = html.match(/https?:\/\/[^\s"']+/);
  const link = linkMatch?.[0];

  // Dev mode: log OTP to console when no API key is set.
  if (!apiKey || !fromEmail) {
    console.log("========================================");
    if (debugCode) {
      console.log(`${label} CODE for ${to}: ${debugCode}`);
    } else if (link) {
      console.log(`${label} LINK for ${to}: ${link}`);
    } else {
      console.log(`EMAIL NOT SENT for ${to}: ${subject}`);
    }
    console.log("========================================");
    if (!apiKey) {
      console.log("(Set RESEND_API_KEY to send real emails)");
    } else {
      console.log("(Set AUTH_EMAIL to a verified Resend sender address)");
    }
    return;
  }

  const fromName = process.env.AUTH_EMAIL_NAME;
  const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });
}
