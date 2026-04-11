"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";
import { Lock, Check, Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PortalSetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = api.clientPortal.portal.setPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    mutation.mutate({ password });
  }

  return (
    <div>
      {/* Topbar */}
      <div
        className="sticky top-0 z-40 border-b px-10 py-5"
        style={{ borderColor: "var(--portal-border)", background: "var(--portal-surface)" }}
      >
        <h1 className="font-[var(--font-heading)] text-[22px] font-normal" style={{ color: "var(--portal-text)" }}>
          Set Password
        </h1>
        <div className="mt-0.5 text-[13px]" style={{ color: "var(--portal-text-secondary)" }}>
          Secure your account with a password
        </div>
      </div>

      <div className="p-10 pb-16" style={{ maxWidth: 900 }}>
        <div className="mx-auto mt-10" style={{ maxWidth: 460 }}>
          <div
            className="overflow-hidden rounded-[10px] border"
            style={{ background: "var(--portal-surface)", borderColor: "var(--portal-border)", boxShadow: "var(--portal-shadow)" }}
          >
            {!success ? (
              <>
                {/* Header */}
                <div className="px-7 pt-7">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: "var(--portal-accent-light)", color: "var(--portal-accent)" }}
                  >
                    <Lock className="h-[22px] w-[22px]" />
                  </div>
                  <h2 className="mb-1.5 font-[var(--font-heading)] text-xl font-normal" style={{ color: "var(--portal-text)" }}>
                    Create Your Password
                  </h2>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
                    Set a password so you can log in directly to your client portal at any time.
                    You will still be able to access the portal via email links without a password.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-7 pb-7 pt-6">
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--portal-text)" }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a strong password"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:shadow-[0_0_0_3px_var(--portal-accent-light)]"
                      style={{
                        borderColor: "var(--portal-border)",
                        color: "var(--portal-text)",
                        background: "var(--portal-surface)",
                        fontFamily: "inherit",
                      }}
                    />
                    <div className="mt-1 text-xs" style={{ color: "var(--portal-text-muted)" }}>
                      Must be at least 8 characters with a mix of letters and numbers
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--portal-text)" }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:shadow-[0_0_0_3px_var(--portal-accent-light)]"
                      style={{
                        borderColor: "var(--portal-border)",
                        color: "var(--portal-text)",
                        background: "var(--portal-surface)",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                    style={{ background: "var(--portal-accent)", fontFamily: "inherit" }}
                  >
                    <Lock className="h-4 w-4" />
                    {mutation.isPending ? "Setting..." : "Set Password"}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="px-7 py-10 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--portal-accent-light)", color: "var(--portal-accent)" }}
                >
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="mb-1.5 font-[var(--font-heading)] text-xl font-normal" style={{ color: "var(--portal-text)" }}>
                  Password Set Successfully
                </h3>
                <p className="mb-5 text-[13px] leading-relaxed" style={{ color: "var(--portal-text-secondary)" }}>
                  Your password has been saved. You can now log in to your client portal directly
                  using your email address and this password.
                </p>
                <Link
                  href="/portal/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-2 text-[13px] font-semibold transition-colors"
                  style={{ borderColor: "var(--portal-border)", color: "var(--portal-text)" }}
                >
                  <ChevronLeft className="h-[15px] w-[15px]" />
                  Back to Dashboard
                </Link>
              </div>
            )}
          </div>

          {/* Security note */}
          <div
            className="mt-5 flex items-start gap-2.5 rounded-lg p-3.5"
            style={{ background: "var(--portal-warm)" }}
          >
            <Shield className="mt-0.5 h-[15px] w-[15px] shrink-0" style={{ color: "var(--portal-text-muted)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--portal-text-muted)" }}>
              Your password is encrypted and stored securely. We never share your credentials with third parties.
              If you forget your password, you can always request a new magic link via email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
