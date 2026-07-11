import { Link, useLocation } from "wouter";
import { LogIn, LogOut, User, Zap, ChevronDown, Crown } from "lucide-react";
import { useUser, useUsage, useLogout } from "@/hooks/use-auth";
import { useState } from "react";

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground border-white/10",
  basic: "text-blue-400 border-blue-500/30",
  pro: "text-amber-400 border-amber-500/30",
  guest: "text-muted-foreground border-white/10",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  guest: "Guest",
};

export function AppHeader() {
  const { data: user, isLoading } = useUser();
  const { data: usage } = useUsage();
  const logoutMutation = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const planKey = usage?.plan ?? "guest";
  const planColor = PLAN_COLORS[planKey] ?? PLAN_COLORS.free;
  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? 2;
  const usagePct = Math.min((used / limit) * 100, 100);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:block font-bold">Master EJ</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-white transition-colors">Transcribe</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Usage meter — only shown when logged in */}
          {user && usage && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{used}/{limit >= 9999 ? "∞" : limit}</span>
              <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${planColor}`}>
                {PLAN_LABELS[planKey]}
              </span>
            </div>
          )}

          {!isLoading && !user && (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5"
                data-testid="link-login"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                data-testid="link-signup"
              >
                Sign up free
              </Link>
            </>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
                data-testid="button-user-menu"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="hidden sm:block max-w-[120px] truncate">{user.name || user.email}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                      <p className={`text-xs mt-0.5 ${planColor}`}>{PLAN_LABELS[planKey]} Plan</p>
                    </div>
                    {planKey === "free" && (
                      <Link
                        href="/pricing"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-400/5 transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Crown className="w-4 h-4" /> Upgrade to Pro
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logoutMutation.mutate(undefined, { onSuccess: () => navigate("/") });
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
