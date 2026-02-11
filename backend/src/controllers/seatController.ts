import { Request, Response } from "express";
import { SeatModel } from "../models/Seat.js";
import { SeatWinnerModel } from "../models/SeatWinner.js";

export const upsertSeat = async (req: Request, res: Response) => {
  const payload = req.body as Partial<{
    seatId: number;
    name: string;
    divisionId: string;
    districtId: string;
    totalVoters: number;
  }>;

  if (payload.seatId === undefined || !payload.name) {
    return res.status(400).json({ message: "seatId and name are required" });
  }

  const seat = await SeatModel.findOneAndUpdate(
    { seatId: payload.seatId },
    { $set: payload },
    { upsert: true, new: true }
  );

  return res.json(seat);
};

export const listSeatWinners = async (_req: Request, res: Response) => {
  const winners = await SeatWinnerModel.find({}).sort({ seatId: 1 }).lean();
  return res.json(winners);
};

export const getSeatWinner = async (req: Request, res: Response) => {
  const seatId = Number(req.params.seatId);
  if (Number.isNaN(seatId)) {
    return res.status(400).json({ message: "Invalid seatId" });
  }
  const winner = await SeatWinnerModel.findOne({ seatId }).lean();
  return res.json(winner ?? null);
};
