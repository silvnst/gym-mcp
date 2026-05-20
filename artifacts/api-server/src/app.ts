import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes/index.js";
import { setupMcpRoutes } from "./mcp/server.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: process.env["FRONTEND_ORIGIN"] ?? "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// MCP_SECRET guard: if set, the request must supply it as ?token=.
// If unset, the guard is skipped (local dev only).
app.use("/mcp", (req, res, next) => {
  const secret = process.env["MCP_SECRET"];
  const token = req.query["token"] as string | undefined;
  if (secret && token !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
});

setupMcpRoutes(app);

const frontendDist = path.join(process.cwd(), "artifacts/gym-tracker/dist/public");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Express 5 requires "/{*path}" — plain "*" doesn't match multi-segment paths
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
