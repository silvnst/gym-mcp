import type { Request, Response, NextFunction } from "express";
import { tokenStore } from "../lib/tokenStore.js";

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (!tokenStore.valid(token)) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  next();
}
