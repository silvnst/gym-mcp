import type { Request, Response, NextFunction } from "express";

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["MCP_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "MCP_API_KEY is not configured" });
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (token !== apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}
