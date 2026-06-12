import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, X, Zap, Crown, Rocket, ArrowLeft, Loader2 } from "lucide-react";
import { useUser, useStartCheckout } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { motion } from "framer-motion";

const PLANS = [
  {
    key: "free",
    name: "Free",
    icon: <Zap className="w-5 h-5" />,
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    description: "Try Master EJ Script Generator at no cost",
    color: "border-white/10",
    badge: null,
    features: [
      { label: "10 transcripts per month", ok: true },
      { label: "Facebook, YouTube, Instagram, TikTok URLs", ok: true },
      { label: "File upload (MP3, MP4, WAV…)", ok: true },
      { label: "AI-powered summary", ok: true },
      { label: "Copy & TXT download", ok: true },
      { label: "Ad-supported", ok: false, note: "shows ads" },
      { label: "SRT subtitle download", ok: false },
      { label: "Priority processing queue", ok: false },
    ],
    cta: "Get started free",
    ctaStyle: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
  },
  {
    key: "basic",
    name: "Basic",
    icon: <Crown className="w-5 h-5" />,
    monthlyPrice: 2.50,
    annualPrice: 2.50,   // shown per-month when annual toggle active
    annualTotal: 19.99,  // actual annual charge
    description: "Great for regular creators",
    color: "border-blue-500/40",
    badge: "Most popular",
    features: [
      { label: "50 transcripts per 28 days", ok: true },
      { label: "Facebook, YouTube, Instagram, TikTok URLs", ok: true },
      { label: "File upload (MP3, MP4, WAV…)", ok: true },
      { label: "AI-powered summary", ok: true },
      { label: "Copy & TXT download", ok: true },
      { label: "Ad-free experience", ok: true },
      { label: "SRT subtitle download", ok: true },
      { label: "Priority processing queue", ok: false },
    ],
    cta: "Start Basic",
    ctaStyle: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
  },
  {
    key: "pro",
    name: "Pro",
    icon: <Rocket className="w-5 h-5" />,
    monthlyPrice: 9.99,
    annualPrice: 9.99,   // shown per-month when annual toggle active
    annualTotal: 7.00,   // actual annual charge — special yearly deal
    description: "Unlimited power for heavy users",
    color: "border-amber-500/40",
    badge: "Best value",
    features: [
      { label: "Unlimited transcripts", ok: true },
      { label: "Facebook, YouTube, Instagram, TikTok URLs", ok: true },
      { label: "File upload (MP3, MP4, WAV…)", ok: true },
      { label: "AI-powered summary", ok: true },
      { label: "Copy & TXT download", ok: true },
      { label: "Ad-free experience", ok: true },
      { label: "SRT subtitle download", ok: true },
      { label: "Priority processing queue", ok: true },
    ],
    cta: "Start Pro",
    ctaStyle:
      "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20",
  },
];

const COMPETITORS = [
  { name: "Otter.ai",     monthly: "$16.99", facebook: false, srt: false  },
  { name: "Veed.io",      monthly: "$18.00", facebook: false, srt: true   },
  { name: "Transkriptor", monthly: "$9.99",  facebook: false, srt: true   },
  { name: "Descript",     monthly: "$24.00", facebook: false, srt: false  },
  { name: "Rev.com",      monthly: "Per min", facebook: false, srt: false },
  { name: "Master EJ Pro ✓", monthly: "$9.99", facebook: true, srt: true, us: true },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { data: user } = useUser();
  const checkoutMutation = useStartCheckout();
  const [, navigate] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const handleSubscribe = (planKey: string) => {
    if (planKey === "free") return navigate("/register");
    if (!user) return navigate("/register");
    checkoutMutation.mutate({
      plan: planKey as "basic" | "pro",
      cycle: annual ? "annual" : "monthly",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to app
        </Link>

        {success && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Subscription activated — welcome to your new plan!
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl text-muted-foreground">
            Checkout was canceled. No charge was made.
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Simple, honest pricing</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Half the price of competitors — and we're the{" "}
            <span className="text-white font-medium">only tool</span> that reliably transcribes Facebook videos.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-card border border-white/10 rounded-full p-1.5">
            <button
              data-testid="button-toggle-monthly"
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !annual ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              data-testid="button-toggle-annual"
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                annual ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Save big
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative glass-card rounded-2xl p-8 border ${plan.color} flex flex-col`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      plan.key === "basic"
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.key === "free"
                      ? "bg-white/5"
                      : plan.key === "basic"
                      ? "bg-blue-500/15 text-blue-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {plan.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              {/* Price display */}
              <div className="mb-6">
                {plan.monthlyPrice === 0 ? (
                  <p className="text-4xl font-bold">Free</p>
                ) : annual && plan.key === "pro" ? (
                  // Pro annual — special $7/year deal
                  <>
                    <p className="text-4xl font-bold">
                      $7
                      <span className="text-base font-normal text-muted-foreground">/year</span>
                    </p>
                    <p className="text-sm text-amber-400 font-medium mt-1">Full year for just $7 — best deal</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold">
                      ${plan.monthlyPrice.toFixed(2)}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </p>
                    {annual && plan.annualTotal > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${plan.annualTotal.toFixed(2)} billed annually
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={`flex items-start gap-2.5 text-sm ${
                      f.ok ? "text-white/80" : "text-muted-foreground/50"
                    }`}
                  >
                    {f.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-white/15 shrink-0 mt-0.5" />
                    )}
                    {f.label}
                    {(f as any).note && (
                      <span className="text-xs text-muted-foreground/60 ml-1">({(f as any).note})</span>
                    )}
                  </li>
                ))}
              </ul>

              {user?.plan === plan.key ? (
                <div className="w-full py-2.5 rounded-lg text-center text-sm font-medium bg-white/5 border border-white/10 text-muted-foreground">
                  Your current plan
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={checkoutMutation.isPending}
                  data-testid={`button-subscribe-${plan.key}`}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${plan.ctaStyle}`}
                >
                  {checkoutMutation.isPending &&
                    checkoutMutation.variables?.plan === plan.key && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  {plan.cta}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Competitor comparison */}
        <div className="mb-16">
          <h2 className="text-2xl font-display font-bold text-center mb-8">
            How we compare to the competition
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="text-left px-6 py-4 font-semibold">Service</th>
                  <th className="text-center px-4 py-4 font-semibold">Starting price</th>
                  <th className="text-center px-4 py-4 font-semibold">Facebook video</th>
                  <th className="text-center px-4 py-4 font-semibold">SRT download</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr
                    key={c.name}
                    className={`border-b border-white/5 ${(c as any).us ? "bg-primary/5" : "hover:bg-white/2"}`}
                  >
                    <td className={`px-6 py-3.5 font-medium ${(c as any).us ? "text-primary" : ""}`}>
                      {c.name}{" "}
                      {(c as any).us && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3.5 font-mono">{c.monthly}</td>
                    <td className="text-center px-4 py-3.5">
                      {c.facebook ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-white/20 mx-auto" />
                      )}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      {c.srt ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-white/20 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-center mb-8">Questions & answers</h2>
          {[
            {
              q: "Can I cancel anytime?",
              a: "Yes. Cancel in one click — no questions asked. You keep your plan features until the end of your billing period.",
            },
            {
              q: "How does the free tier work?",
              a: "You get 10 transcripts every 28 days at no cost. Ads are shown to keep the service running. Upgrade anytime for more.",
            },
            {
              q: "How does the 28-day reset work?",
              a: "Your transcript count resets 28 days after your first transcript. This means everyone gets a consistent window regardless of which month they signed up.",
            },
            {
              q: "Why can you transcribe Facebook videos when others can't?",
              a: "We built a custom extraction pipeline for Facebook that handles their video delivery system. Most competitors only support YouTube and file uploads.",
            },
            {
              q: "What payment methods do you accept?",
              a: "All major credit and debit cards via Stripe. Your card details are never stored on our servers.",
            },
          ].map((item) => (
            <details key={item.q} className="group border-b border-white/10 py-4 cursor-pointer">
              <summary className="font-medium list-none flex items-center justify-between gap-4 hover:text-white transition-colors">
                {item.q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform shrink-0 text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
