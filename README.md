# Master EJ Script Generator

An open-source web app for turning public video links and uploaded audio/video
files into downloadable transcripts. It supports automatic language detection,
many explicit Whisper language choices, and **Urdu in the English alphabet
(Roman Urdu)**.

## Features

- Public URL ingestion for supported video platforms
- Audio and video file uploads
- Auto-detect or choose the spoken language
- Roman Urdu output that preserves the Urdu meaning
- Plain text, VTT, and plan-gated SRT downloads
- Optional accounts, Google/GitHub sign-in, usage limits, subscriptions, and ads

## Run locally

```bash
npm install
npm run db:push
npm run dev
```

The app needs PostgreSQL and an OpenAI-compatible API key. Add secrets through
your environment/secrets manager; never commit them to this repository.

## Monetization

The app includes two optional income paths: paid subscription plans through
Stripe and advertising placements through `AdBanner`. Stripe price IDs and a
webhook signing secret must be configured before accepting live payments.
Advertising requires approval from the ad provider.

## Responsible use

Only submit media you own or have permission to process. Platform extraction
depends on the source being publicly accessible and may change when a platform
changes its rules.

## License

This project is released under the [MIT License](LICENSE).