import { Request, Response } from "express";
import { CandidateModel, type CandidateDocument } from "../models/Candidate.js";
import { recomputeSeatWinner } from "../services/winnerService.js";
import { load } from "cheerio";

export const listCandidatesBySeat = async (req: Request, res: Response) => {
  const seatId = Number(req.params.seatId);
  if (Number.isNaN(seatId)) {
    return res.status(400).json({ message: "Invalid seatId" });
  }
  const candidates = await CandidateModel.find({ seatId }).sort({ votes: -1 }).lean();
  return res.json(
    candidates.map((candidate) => ({
      ...candidate,
      id: candidate._id?.toString(),
    }))
  );
};

export const upsertCandidate = async (req: Request, res: Response) => {
  const payload = req.body as Partial<{
    _id: string;
    name: string;
    partyId: string;
    partyLabel: string;
    seatId: number;
    symbol: string;
    symbolLabel: string;
    symbolImageUrl: string;
    imageUrl: string;
    votes: number;
  }>;

  if (!payload.name || payload.seatId === undefined) {
    return res.status(400).json({ message: "name and seatId are required" });
  }

  const candidate = await CandidateModel.findOneAndUpdate(
    { _id: payload._id },
    { $set: payload },
    { upsert: true, new: true }
  );

  await recomputeSeatWinner(payload.seatId);
  return res.json(candidate);
};

export const setCandidateVotes = async (req: Request, res: Response) => {
  const seatId = Number(req.params.seatId);
  const candidateId = req.params.candidateId;
  const votes = Number(req.body?.votes);
  if (Number.isNaN(seatId) || !candidateId || Number.isNaN(votes)) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const candidate = await CandidateModel.findOneAndUpdate(
    { _id: candidateId, seatId },
    { $set: { votes: Math.max(0, votes) } },
    { new: true }
  );

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  const winner = await recomputeSeatWinner(seatId);
  return res.json({
    candidate: candidate ? { ...candidate.toObject(), id: candidate._id.toString() } : null,
    winner,
  });
};

export const syncCandidatesFromLive = async (req: Request, res: Response) => {
  const seatId = Number(req.params.seatId);
  const zillaId = String(req.query.zillaId ?? "");
  if (Number.isNaN(seatId) || !zillaId) {
    return res.status(400).json({ message: "seatId and zillaId are required" });
  }

  const url = `http://103.183.38.66/get/candidate/data?zilla_id=${zillaId}&candidate_type=1&election_id=478&constituency_id=${seatId}&ward_id=&status_id=11`;
  const response = await fetch(url);
  const text = await response.text();
  const rawHtml = text.trim().startsWith("\"") ? JSON.parse(text) : text;
  const sanitizedHtml = rawHtml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const decodedHtml = sanitizedHtml.includes("\\u003c")
    ? sanitizedHtml
        .replace(/\\u003c/g, "<")
        .replace(/\\u003e/g, ">")
        .replace(/\\u0026amp;/g, "&amp;")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
    : sanitizedHtml;

  const wrappedHtml = `<table>${decodedHtml}</table>`;
  const $ = load(wrappedHtml);
  const rows = $("tr").toArray();

  const upserted = [] as CandidateDocument[];
  for (const row of rows) {
    const cells = $(row).find("td");
    const name = $(cells[0]).text().trim();
    if (!name) continue;
    const imageUrl = $(cells[1]).find("img").attr("src");
    const partyLabel = $(cells[2]).text().trim() || "Independent";
    const symbolCell = $(cells[3]);
    const symbolLabel = symbolCell.text().trim();
    const symbolImageUrl = symbolCell.find("img").attr("src");

    const candidate = await CandidateModel.findOneAndUpdate(
      { seatId, name },
      {
        $set: {
          name,
          seatId,
          partyLabel,
          imageUrl,
          symbolLabel: symbolLabel || undefined,
          symbolImageUrl,
          symbol: symbolLabel || undefined,
        },
      },
      { upsert: true, new: true }
    );
    upserted.push(candidate);
  }

  await recomputeSeatWinner(seatId);
  return res.json(
    upserted.map((candidate) => ({
      ...candidate.toObject(),
      id: candidate._id.toString(),
    }))
  );
};
