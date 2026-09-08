---
name: Public downloader boundary
description: Product and safety limits for the open-source media downloader.
---

The downloader should process one publicly accessible media URL at a time, cap output size, clean temporary files after each request, and offer direct MP4/MP3 responses without extensions, redirects, or platform credentials.

**Why:** SaveFrom-style services are difficult to make universal because platforms change, private/DRM media requires authorization, and extension/redirect patterns create security and trust risks.

**How to apply:** Keep unsupported/private/bot-blocked sources as explicit failures, advertise only platforms tested in the current extractor, and treat format/quality choices as best-effort with safe fallback.