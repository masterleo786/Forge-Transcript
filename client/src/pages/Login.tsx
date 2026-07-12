import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { SiGoogle, SiGithub } from "react-icons/si";
import { useLogin } from "@/hooks/use-auth";

function OAuthButtons({ providers }: { providers: { google: boolean; github: boolean } }) {
  if (!providers.google && !providers.github) return null;
  return (
    <div className="space-y-2 mb-5">
      {providers.google && (
        <a
          href="/auth/google"
          data-testid="button-google-login"
          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
        >
          <SiGoogle className="w-4 h-4 text-red-400" />
          Continue with Google
        </a>
      )}
      {providers.github && (
        <a
          href="/auth/github"
          data-testid="button-github-login"
          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
        >
          <SiGithub className="w-4 h-4" />
          Continue with GitHub
        </a>
      )}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState({ google: false, github: false });
  const [, navigate] = useLocation();
  const loginMutation = useLogin();

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password }, { onSuccess: () => navigate("/") });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-display font-bold text-2xl mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            Master EJ Script Generator
          </div>
          <p className="text-muted-foreground text-sm mt-2">Welcome back</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-xl font-semibold mb-5">Sign in to your account</h1>

          <OAuthButtons providers={providers} />

          {loginMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginMutation.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                data-testid="input-email"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  data-testid="input-password"
                  className="w-full px-4 py-2.5 pr-12 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  data-testid="button-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
              className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
