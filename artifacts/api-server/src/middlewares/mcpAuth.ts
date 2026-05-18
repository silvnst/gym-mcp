import type { Request, Response, NextFunction } from "express";
import { tokenStore } from "../lib/tokenStore.js";

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const base = `${req.protocol}://${req.get("host")}`;
  const wwwAuth = `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`;

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.setHeader("WWW-Authenticate", wwwAuth);
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (!tokenStore.valid(token)) {
    res.setHeader("WWW-Authenticate", wwwAuth);
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  next();
}
