import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// Shared frame for the login and register screens.
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-card animate-fade-up space-y-7">
        <div className="space-y-7">
          <Link to="/" className="auth-brand"><span className="auth-brand-mark" aria-hidden>BB</span>ByteBattles</Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="auth-caption text-sm">{subtitle}</p>
          </div>
        </div>
        {children}
        <p className="auth-caption border-t pt-4 text-center text-xs" style={{ borderColor: "var(--line)" }}>
          By continuing, you agree to use ByteBattles responsibly.
        </p>
      </div>
    </main>
  );
}
