import { Router } from "express";
import { getSeatWinner, listSeatWinners, upsertSeat } from "../controllers/seatController.js";

const router = Router();

router.post("/seats", upsertSeat);
router.get("/seats/winners", listSeatWinners);
router.get("/seats/:seatId/winner", getSeatWinner);

export default router;
