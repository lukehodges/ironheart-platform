// src/app/portal/layout.tsx
import { Fraunces, Sora } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  axes: ["opsz"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Client Portal — Luke Hodges",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${sora.variable}`}
      style={{
        // Design tokens matching mockups exactly
        "--bg": "#faf9f7",
        "--bg-warm": "#f5f3ef",
        "--bg-card": "#ffffff",
        "--text-1": "#1a1a1a",
        "--text-2": "#5a5a5a",
        "--text-3": "#8a8a8a",
        "--text-4": "#b0ada8",
        "--amber": "#b8863e",
        "--amber-bright": "#c8964c",
        "--amber-light": "#e4c78e",
        "--amber-dim": "rgba(184,134,62,0.06)",
        "--amber-border": "rgba(184,134,62,0.18)",
        "--green": "#3d8a5a",
        "--green-bright": "#4a9e6e",
        "--green-light": "#e8f5ee",
        "--green-border": "rgba(61,138,90,0.2)",
        "--green-dim": "rgba(61,138,90,0.08)",
        "--border": "#e8e5e0",
        "--border-light": "#f0ede8",
        "--shadow-sm": "0 1px 3px rgba(0,0,0,0.04)",
        "--shadow-md": "0 4px 20px rgba(0,0,0,0.06)",
        "--shadow-lg": "0 12px 48px rgba(0,0,0,0.08)",
      } as React.CSSProperties}
    >
      <div
        className="min-h-screen font-[var(--font-body)]"
        style={{
          background: "var(--bg)",
          color: "var(--text-1)",
          fontSize: "15px",
          lineHeight: 1.7,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </div>
    </div>
  );
}
