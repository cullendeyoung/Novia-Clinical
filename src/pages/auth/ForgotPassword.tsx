import { useState } from "react";
import RequestResetForm from "@/components/auth/RequestResetForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ForgotPassword() {
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-sm md:max-w-[500px] md:p-12">
      {sentToEmail ? (
        <ResetPasswordForm
          email={sentToEmail}
          onBack={() => setSentToEmail(null)}
        />
      ) : (
        <RequestResetForm onSuccess={setSentToEmail} />
      )}
    </div>
  );
}
