# Master EJ Script Generator

An open-source web app for turning public video links and uploaded audio/video
files into downloadable transcripts. It supports automatic language detection,
many explicit Whisper language choices, **Urdu in the English alphabet
(Roman Urdu)**, and public-media downloads.

## Features

- Public URL ingestion for supported video platforms
- Audio and video file uploads
- Auto-detect or choose the spoken language
- Public MP4 video and MP3 audio downloads with quality choices
- Roman Urdu output that preserves the Urdu meaning
- Plain text, VTT, and SRT downloads
- Optional accounts, Google/GitHub sign-in, usage limits, and ads

## Run locally

```bash
npm install
npm run db:push
npm run dev
```

The app needs PostgreSQL and an OpenAI-compatible API key. Add secrets through
your environment/secrets manager; never commit them to this repository.

## Monetization

The hosted version is free and supported by advertising placements through
`AdBanner`. Advertising requires approval from the ad provider. Self-hosters
can remove or replace the ad component.

## Responsible use

Only submit media you own or have permission to process. Platform extraction
depends on the source being publicly accessible and may change when a platform
changes its rules.

The downloader handles one public media URL at a time, rejects private/local
network URLs, limits downloads to 250 MB, and does not collect platform
credentials. Private, DRM-protected, deleted, region-blocked, or bot-protected
media may still be unavailable.

## License

This project is released under the [MIT License](LICENSE).