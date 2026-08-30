---
name: Production database freeze
description: Published app can have a successful build and healthy static pages while database-backed routes fail when production PostgreSQL is frozen.
---

A successful deployment build does not prove database-backed production routes work. Verify a live database query or transcript-list request; a frozen production database must be unfrozen in Replit before republishing.

**Why:** The app can start and serve static pages while PostgreSQL rejects production queries with code 28000.

**How to apply:** Before calling a publish ready, test the published API, not only `/` and the build. If production reports a frozen database, treat publishing as blocked until the database is unfrozen.