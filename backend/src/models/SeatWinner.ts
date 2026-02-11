import mongoose, { Schema } from "mongoose";

export type SeatWinnerDocument = mongoose.Document & {
  seatId: number;
  candidateId: string | null;
  candidateName: string | null;
  partyLabel?: string | null;
  votes: number;
  updatedAt: Date;
};

const SeatWinnerSchema = new Schema<SeatWinnerDocument>(
  {
    seatId: { type: Number, required: true, unique: true, index: true },
    candidateId: { type: String, default: null },
    candidateName: { type: String, default: null },
    partyLabel: { type: String, default: null },
    votes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SeatWinnerModel = mongoose.model<SeatWinnerDocument>("SeatWinner", SeatWinnerSchema);
