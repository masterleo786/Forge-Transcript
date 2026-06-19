import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRegister } from "@/hooks/use-auth";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [, navigate] = useLocation();
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    registerMutation.mutate({ name, email, password }, { onSuccess: () => navigate("/") });
  };

  const perks = [
    "10 free transcripts every 28 days",
    "Facebook, YouTube, Instagram, TikTok",
    "AI-powered summaries",
    "TXT download",
  ];

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
          <p className="text-muted-foreground text-sm mt-2">Start for free — no credit card needed</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-xl font-semibold mb-2">Create your account</h1>

          <ul className="space-y-1.5 mb-6">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                {perk}
              </li>
            ))}
          </ul>

          {registerMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {registerMutation.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                data-testid="input-name"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
                  minLength={6}
                  placeholder="At least 6 characters"
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

            <div className="flex items-start gap-3 pt-1">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                data-testid="checkbox-agree-terms"
                className="mt-0.5 w-4 h-4 rounded border border-white/20 bg-black/30 accent-primary cursor-pointer shrink-0"
              />
              <label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                I agree to the{" "}
                <span className="text-primary hover:underline">Terms of Service</span> and{" "}
                <span className="text-primary hover:underline">Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending || !agreed}
              data-testid="button-register-submit"
              className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create free account
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
