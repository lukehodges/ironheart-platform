"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";

export function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/portal/dashboard";

  const loginMutation = api.clientPortal.portal.login.useMutation({
    onSuccess: (data) => {
      document.cookie = `portal_session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      window.location.href = redirectTo;
    },
    onError: (error) => {
      setLoggingIn(false);
      toast.error(error.message || "Invalid email or password");
    },
  });

  const magicLinkMutation = api.clientPortal.portal.requestMagicLink.useMutation({
    onSuccess: () => setMagicLinkSent(true),
    onError: () => setMagicLinkSent(true), // Silent fail — don't reveal if email exists
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoggingIn(true);
    loginMutation.mutate({ email, password });
  }

  function handleMagicLink() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    magicLinkMutation.mutate({ email });
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ position: "relative" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 35% at 50% 30%, rgba(184,134,62,0.06), transparent)" }}
      />

      {/* Brand */}
      <div
        className="relative mb-8 text-center"
        style={{ animation: "fadeInUp 0.6s ease 0.1s forwards", opacity: 0 }}
      >
        <div
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[10px] text-[20px] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
            boxShadow: "0 4px 16px rgba(184,134,62,0.3)",
          }}
        >
          {process.env.NEXT_PUBLIC_BRAND_INITIAL ?? "C"}
        </div>
        <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>{process.env.NEXT_PUBLIC_BRAND_NAME ?? "Client Portal"}</p>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Client Portal</p>
      </div>

      {/* Login card */}
      <div
        className="relative w-full max-w-[400px] rounded-xl border p-9"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.6s ease 0.25s forwards",
          opacity: 0,
        }}
      >
        <h2 className="mb-1 text-center font-[var(--font-heading)] text-[22px]" style={{ color: "var(--text-1)" }}>
          Welcome back
        </h2>
        <p className="mb-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
          Sign in to your client portal
        </p>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="mb-4">
            <label htmlFor="portal-email" className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Email
            </label>
            <input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
                e.target.style.background = "var(--bg-card)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
                e.target.style.background = "var(--bg)";
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <label htmlFor="portal-password" className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Password
            </label>
            <input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
                e.target.style.background = "var(--bg-card)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
                e.target.style.background = "var(--bg)";
              }}
            />
          </div>

          {/* Forgot password */}
          <div className="mb-5 text-right">
            <button
              type="button"
              onClick={handleMagicLink}
              className="text-[12px] transition-colors"
              style={{ color: "var(--text-4)" }}
            >
              Forgot password?
            </button>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loggingIn}
            className="group relative w-full overflow-hidden rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <span className="relative z-10">{loggingIn ? "Signing in..." : "Log In"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>or</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        {/* Magic link */}
        {!magicLinkSent ? (
          <button
            onClick={handleMagicLink}
            disabled={magicLinkMutation.isPending}
            className="w-full rounded-lg border px-6 py-3 text-[14px] font-medium transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-2)",
              background: "transparent",
            }}
          >
            {magicLinkMutation.isPending ? "Sending..." : "Send me a magic link instead"}
          </button>
        ) : (
          <div className="py-2 text-center">
            <div className="flex items-center justify-center gap-2 text-[14px]" style={{ color: "var(--green)" }}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Check your email for a sign-in link
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="mt-8 text-[13px]"
        style={{
          color: "var(--text-4)",
          animation: "fadeInUp 0.6s ease 0.4s forwards",
          opacity: 0,
        }}
      >
        Need help?{" "}
        {process.env.NEXT_PUBLIC_CONTACT_EMAIL ? (
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`} className="underline" style={{ color: "var(--text-3)" }}>
            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
          </a>
        ) : "contact us"}
      </p>
    </div>
  );
}
