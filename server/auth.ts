import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { type Express } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {}
  }
}

const PgSession = connectPg(session);

function getBaseUrl(req: any): string {
  // Use the deployed domain if available, otherwise derive from request
  const host = process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",")[0]
    : req?.get("host");
  const proto = process.env.NODE_ENV === "production" ? "https" : (req?.protocol ?? "https");
  return `${proto}://${host}`;
}

export function setupAuth(app: Express) {
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "transcriptforge-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Local Strategy ─────────────────────────────────────────────────────────

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase());
        if (!user) return done(null, false, { message: "No account with that email" });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return done(null, false, { message: "Incorrect password" });
        const { password: _pw, ...safeUser } = user;
        return done(null, safeUser as Express.User);
      } catch (err) {
        return done(err);
      }
    })
  );

  // ─── Google Strategy ────────────────────────────────────────────────────────

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: "/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error("No email from Google"));
            const name = profile.displayName || profile.emails?.[0]?.value?.split("@")[0];
            const user = await storage.findOrCreateOAuthUser(email.toLowerCase(), name);
            const { password: _pw, ...safeUser } = user;
            return done(null, safeUser as Express.User);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  // ─── GitHub Strategy ────────────────────────────────────────────────────────

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: "/auth/github/callback",
          scope: ["user:email"],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const email =
              profile.emails?.find((e: any) => e.primary)?.value ||
              profile.emails?.[0]?.value;
            if (!email) return done(new Error("No email from GitHub — make sure your GitHub email is public"));
            const name = profile.displayName || profile.username;
            const user = await storage.findOrCreateOAuthUser(email.toLowerCase(), name);
            const { password: _pw, ...safeUser } = user;
            return done(null, safeUser as Express.User);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  // ─── Serialize / Deserialize ────────────────────────────────────────────────

  passport.serializeUser((user, done) => done(null, (user as any).id));

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) return done(null, false);
      const { password: _pw, ...safeUser } = user;
      done(null, safeUser as Express.User);
    } catch (err) {
      done(err);
    }
  });

  // ─── Local Auth Routes ───────────────────────────────────────────────────────

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });
      const hashed = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email: email.toLowerCase(), password: hashed, name });
      const { password: _pw, ...safeUser } = user;
      req.login(safeUser as Express.User, (err) => {
        if (err) return res.status(500).json({ message: "Login after register failed" });
        res.status(201).json(safeUser);
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });

  // ─── Google OAuth Routes ─────────────────────────────────────────────────────

  app.get("/auth/google", (req, res, next) => {
    if (!googleClientId) {
      return res.redirect("/?error=google_not_configured");
    }
    passport.authenticate("google")(req, res, next);
  });

  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google_failed" }),
    (_req, res) => res.redirect("/")
  );

  // ─── GitHub OAuth Routes ─────────────────────────────────────────────────────

  app.get("/auth/github", (req, res, next) => {
    if (!githubClientId) {
      return res.redirect("/?error=github_not_configured");
    }
    passport.authenticate("github")(req, res, next);
  });

  app.get("/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login?error=github_failed" }),
    (_req, res) => res.redirect("/")
  );

  // ─── OAuth status (so frontend knows which providers are enabled) ─────────────

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!googleClientId,
      github: !!githubClientId,
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
