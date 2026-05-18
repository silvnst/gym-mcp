import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes/index.js";
import oauthRouter from "./routes/oauth.js";
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

app.use(oauthRouter);
app.use("/api", router);

setupMcpRoutes(app);

const frontendDist = path.join(process.cwd(), "artifacts/gym-tracker/dist");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Catch-all: serve index.html for any route not handled above (React Router)
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
