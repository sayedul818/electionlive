import mongoose, { Schema } from "mongoose";

export type SeatDocument = mongoose.Document & {
  seatId: number;
  name: string;
  divisionId?: string;
  districtId?: string;
  totalVoters?: number;
};

const SeatSchema = new Schema<SeatDocument>(
  {
    seatId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    divisionId: { type: String },
    districtId: { type: String },
    totalVoters: { type: Number },
  },
  { timestamps: true }
);

export const SeatModel = mongoose.model<SeatDocument>("Seat", SeatSchema);
