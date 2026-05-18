import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { tokenStore } from "../lib/tokenStore.js";
import { refreshStore } from "../lib/refreshStore.js";
import { authCodeStore } from "../lib/authCodeStore.js";

const router = Router();

// ── Protected Resource Metadata (RFC 9728) ────────────────────────────────────

router.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
  });
});

// ── OAuth 2.0 discovery ────────────────────────────────────────────────────────

router.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// ── Dynamic Client Registration (RFC 7591) ────────────────────────────────────

router.post("/register", (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const redirectUris = Array.isArray(body["redirect_uris"])
    ? (body["redirect_uris"] as string[])
    : [];

  res.status(201).json({
    client_id: randomUUID(),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
});

// ── Authorization endpoint ─────────────────────────────────────────────────────

router.get("/authorize", (req, res) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = req.query as Record<string, string>;

  if (response_type !== "code") {
    res.status(400).send("unsupported_response_type");
    return;
  }
  if (!redirect_uri || !code_challenge || code_challenge_method !== "S256") {
    res.status(400).send("invalid_request");
    return;
  }

  // Build a signed pending-request token so the POST can trust the params
  const pendingId = randomUUID();
  authCodeStore.add(
    pendingId,
    {
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      redirectUri: redirect_uri,
      clientId: client_id ?? "",
    },
    300_000, // 5 min to click the button
  );

  const appName = "Gym Tracker";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorize — ${appName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 2rem;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #888;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .scope-list {
      text-align: left;
      background: #1e1e1e;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
      list-style: none;
    }
    .scope-list li {
      font-size: 0.875rem;
      color: #aaa;
      padding: 0.3rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .scope-list li::before {
      content: "✓";
      color: #22c55e;
      font-weight: 700;
      flex-shrink: 0;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 0.875rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-primary {
      background: #22c55e;
      color: #000;
      margin-bottom: 0.75rem;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🏋️</div>
    <h1>Authorize Claude.ai</h1>
    <p class="subtitle">
      Claude.ai wants to connect to your <strong style="color:#fff">${appName}</strong>.
    </p>
    <ul class="scope-list">
      <li>Read your workout history and sessions</li>
      <li>Read your training plans</li>
      <li>View personal records and volume stats</li>
      <li>Log new sessions on your behalf</li>
      <li>Delete sessions on your behalf</li>
    </ul>
    <form method="POST" action="/authorize">
      <input type="hidden" name="pending_id" value="${pendingId}" />
      <input type="hidden" name="state" value="${state ?? ""}" />
      <button type="submit" class="btn btn-primary">Authorize</button>
    </form>
    <p class="footer">
      Only you can see this page. Your data stays on your server.
    </p>
  </div>
</body>
</html>`);
});

router.post("/authorize", (req, res) => {
  const { pending_id, state } = req.body as Record<string, string>;

  const pending = authCodeStore.get(pending_id ?? "");
  if (!pending) {
    res.status(400).send("Authorization request expired or invalid. Please try connecting again.");
    return;
  }

  authCodeStore.delete(pending_id);

  const code = randomUUID();
  authCodeStore.add(code, {
    codeChallenge: pending.codeChallenge,
    codeChallengeMethod: pending.codeChallengeMethod,
    redirectUri: pending.redirectUri,
    clientId: pending.clientId,
  });

  const redirectUrl = new URL(pending.redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  res.redirect(302, redirectUrl.toString());
});

// ── Token endpoint ─────────────────────────────────────────────────────────────

router.post("/token", (req, res) => {
  const body: Record<string, string> = req.body ?? {};
  const { grant_type, code, code_verifier, redirect_uri, refresh_token } = body;

  // ── Refresh token grant ────────────────────────────────────────────────────
  if (grant_type === "refresh_token") {
    if (!refresh_token || !refreshStore.valid(refresh_token)) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }

    // Rotate: delete old refresh token and mint new pair
    refreshStore.delete(refresh_token);

    const newAccessToken = randomUUID();
    const newRefreshToken = randomUUID();
    tokenStore.add(newAccessToken);
    refreshStore.add(newRefreshToken);

    res.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefreshToken,
    });
    return;
  }

  // ── Authorization code grant ───────────────────────────────────────────────
  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  if (!code || !code_verifier) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const entry = authCodeStore.get(code);
  if (!entry) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  // Validate redirect_uri matches
  if (redirect_uri && redirect_uri !== entry.redirectUri) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  // Verify PKCE: BASE64URL(SHA256(code_verifier)) must equal stored code_challenge
  const digest = createHash("sha256").update(code_verifier).digest("base64url");
  if (digest !== entry.codeChallenge) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  authCodeStore.delete(code);

  const accessToken = randomUUID();
  const refreshToken = randomUUID();
  tokenStore.add(accessToken);
  refreshStore.add(refreshToken);

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
  });
});

export default router;
