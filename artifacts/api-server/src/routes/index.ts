import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import plansRouter from "./plans.js";
import sessionsRouter from "./sessions.js";
import setsRouter from "./sets.js";
import progressRouter from "./progress.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plansRouter);
router.use(sessionsRouter);
router.use(setsRouter);
router.use(progressRouter);

export default router;
