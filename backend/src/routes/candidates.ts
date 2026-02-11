import { Router } from "express";
import { listCandidatesBySeat, setCandidateVotes, syncCandidatesFromLive, upsertCandidate } from "../controllers/candidateController.js";

const router = Router();

router.get("/seats/:seatId/candidates", listCandidatesBySeat);
router.post("/seats/:seatId/candidates/sync", syncCandidatesFromLive);
router.put("/seats/:seatId/candidates/:candidateId/votes", setCandidateVotes);
router.post("/candidates", upsertCandidate);

export default router;
