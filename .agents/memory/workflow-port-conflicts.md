---
name: Workflow port conflicts
description: A stale development server can make a managed workflow report failure even when the app itself is healthy.
---

When a workflow reports EADDRINUSE on port 5000, inspect and stop the older server process before restarting the managed workflow; do not treat the port conflict as an application code failure.

**Why:** Replit can retain an earlier `npm run dev` process while a restart launches another copy, causing a false workflow failure.

**How to apply:** After code or configuration changes, verify there is one server process, restart the managed workflow, and check its fresh log before evaluating app health.