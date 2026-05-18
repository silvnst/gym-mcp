import { randomUUID } from "node:crypto";
import { Router } from "express";
import { tokenStore } from "../lib/tokenStore.js";

const router = Router();

router.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    issuer: base,
    token_endpoint: `${base}/token`,
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  });
});

router.post("/token", (req, res) => {
  const body: Record<string, string> = req.body ?? {};
  const { grant_type, client_id, client_secret } = body;

  if (grant_type !== "client_credentials") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const expectedId = process.env["MCP_CLIENT_ID"];
  const expectedSecret = process.env["MCP_CLIENT_SECRET"];

  if (!client_id || !client_secret || client_id !== expectedId || client_secret !== expectedSecret) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  const token = randomUUID();
  tokenStore.add(token);

  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600,
  });
});

export default router;
