import mongoose, { Schema } from "mongoose";

export type CandidateDocument = mongoose.Document & {
  name: string;
  partyId?: string;
  partyLabel?: string;
  seatId: number;
  symbol?: string;
  symbolLabel?: string;
  symbolImageUrl?: string;
  imageUrl?: string;
  votes: number;
};

const CandidateSchema = new Schema<CandidateDocument>(
  {
    name: { type: String, required: true },
    partyId: { type: String },
    partyLabel: { type: String },
    seatId: { type: Number, required: true, index: true },
    symbol: { type: String },
    symbolLabel: { type: String },
    symbolImageUrl: { type: String },
    imageUrl: { type: String },
    votes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CandidateModel = mongoose.model<CandidateDocument>("Candidate", CandidateSchema);
