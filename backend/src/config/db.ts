import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDb = async () => {
  await mongoose.connect(env.mongoUri, {
    dbName: "election-live-db",
  });
};
