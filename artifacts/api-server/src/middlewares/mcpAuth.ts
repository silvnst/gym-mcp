import type { Request, Response, NextFunction } from "express";

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["MCP_API_KEY"];

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (!apiKey || token !== apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}
