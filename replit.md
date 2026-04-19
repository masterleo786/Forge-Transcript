# TranscriptForge

A premium SaaS web app that transcribes public video URLs (Facebook, YouTube, Instagram, TikTok) and uploaded audio/video files. Produces clean transcripts with AI summary, TXT/SRT downloads, and a polished dark-mode UI.

## Architecture

- **Frontend**: React + Vite + Wouter + TanStack Query + shadcn/ui + Framer Motion
- **Backend**: Express.js (ESM) + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Passport.js (local strategy) + express-session + connect-pg-simple
- **AI**: Replit OpenAI integration (gpt-4o-mini-transcribe for STT, gpt-4o for summary)
- **Media**: youtube-dl-exec + ffmpeg-static for URL extraction

## Key Files

| File | Purpose |
|---|---|
| `shared/schema.ts` | Drizzle schema: `users`, `transcripts` tables + plan limits |
| `shared/routes.ts` | API contract types |
| `server/index.ts` | Express entry point — sets up auth then routes |
| `server/auth.ts` | Passport setup, session config, auth routes |
| `server/routes.ts` | Transcript CRUD, Stripe checkout/webhook, usage API |
| `server/storage.ts` | Database interface — all DB queries |
| `server/services/transcription.ts` | OpenAI transcribe + summary |
| `server/services/mediaExtractor.ts` | youtube-dl-exec URL extraction |
| `client/src/hooks/use-auth.ts` | Auth hooks: useUser, useLogin, useRegister, useLogout, useUsage |
| `client/src/hooks/use-transcripts.ts` | Transcript query + mutation hooks with polling |
| `client/src/components/AppHeader.tsx` | Global nav with login/signup, user menu, usage meter |
| `client/src/components/AdBanner.tsx` | Ad placeholder (replace with Google AdSense code) |
| `client/src/pages/Pricing.tsx` | Pricing page with plan comparison + competitor table |

## Subscription Plans

| Plan | Price | Transcripts/month | Ads | SRT |
|---|---|---|---|---|
| Free | $0 | 3 | Yes | No |
| Basic | $4.99/mo or $39/yr | 30 | No | Yes |
| Pro | $9.99/mo or $79/yr | Unlimited | No | Yes |

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (already set) |
| `SESSION_SECRET` | Session signing (already set) |
| `STRIPE_SECRET_KEY` | Stripe API key — needed for payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_BASIC_MONTHLY` | Stripe Price ID for Basic monthly |
| `STRIPE_PRICE_BASIC_ANNUAL` | Stripe Price ID for Basic annual |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe Price ID for Pro monthly |
| `STRIPE_PRICE_PRO_ANNUAL` | Stripe Price ID for Pro annual |

## Ad Integration

To enable real ads:
1. Sign up for Google AdSense at https://adsense.google.com
2. Submit your `.replit.app` URL for approval
3. Once approved, get your ad unit code and paste it into `client/src/components/AdBanner.tsx` replacing the placeholder `<div>` blocks

## Platform Notes

- Facebook video extraction requires public videos only
- Processing runs as a background job — frontend polls every 3 seconds
- The `processUrlTranscription` / `processFileTranscription` functions in routes.ts handle background processing
- Transcripts are scoped to userId — guests can create transcripts too (no account needed)
