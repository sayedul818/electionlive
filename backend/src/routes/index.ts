import { Router } from "express";
import candidateRoutes from "./candidates.js";
import seatRoutes from "./seats.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use(candidateRoutes);
router.use(seatRoutes);

export default router;
