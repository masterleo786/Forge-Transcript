---
name: YouTube availability limits
description: Source-platform bot checks can block server-side YouTube extraction even with a current yt-dlp client.
---

Current yt-dlp clients and updates do not guarantee server-side access to every public YouTube URL. A video can be visible in a browser while automated extraction receives a bot-check response.

**Why:** YouTube applies access controls by IP, client, video, and time; retrying a different client is not a universal fix and can create unnecessary load.

**How to apply:** Keep direct upload as the reliable fallback, classify bot checks separately from private videos, reject empty transcription responses, and never present an empty result as a successful transcript.