import { Link } from "wouter";
import { CheckCircle2, ArrowLeft, Heart, Megaphone } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { motion } from "framer-motion";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to app
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-5">
            <Heart className="w-4 h-4" /> Free for everyone
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Always free. No payment required.</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Master EJ is open source and supported by advertising. Use it to create transcripts without a subscription.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto glass-card rounded-2xl p-8 md:p-10 border border-primary/30"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Free plan</h2>
              <p className="text-muted-foreground">No card. No subscription. No paywall.</p>
            </div>
          </div>
          <ul className="space-y-3 text-white/80 mb-8">
            {[
              "10 transcripts every 28 days with an account",
              "2 transcripts without an account",
              "Public video links and file uploads",
              "70+ language choices",
              "Urdu in English letters (Roman Urdu)",
              "AI summaries and TXT downloads",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary flex items-start gap-3">
            <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
            <span>Ads help pay for the AI processing and keep the service free.</span>
          </div>
        </motion.div>

        <div className="max-w-2xl mx-auto mt-16 text-center text-muted-foreground">
          <h2 className="text-2xl font-display font-bold text-white mb-4">Open source by design</h2>
          <p>
            Anyone can inspect, improve, self-host, and share this project under the MIT License.
            If you find it useful, leaving ads enabled helps keep the hosted version running.
          </p>
        </div>
      </main>
    </div>
  );
}