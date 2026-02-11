import { CandidateModel } from "../models/Candidate.js";
import { SeatWinnerModel } from "../models/SeatWinner.js";

export const recomputeSeatWinner = async (seatId: number) => {
  const topCandidate = await CandidateModel.findOne({ seatId })
    .sort({ votes: -1, updatedAt: 1 })
    .lean();

  const payload = {
    seatId,
    candidateId: topCandidate?._id?.toString() ?? null,
    candidateName: topCandidate?.name ?? null,
    partyLabel: topCandidate?.partyLabel ?? null,
    votes: topCandidate?.votes ?? 0,
  };

  await SeatWinnerModel.findOneAndUpdate({ seatId }, payload, {
    upsert: true,
    new: true,
  });

  return payload;
};
