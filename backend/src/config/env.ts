import dotenv from "dotenv";

dotenv.config();

export const env = {
  mongoUri: process.env.MONGODB_URI ?? "",
  port: Number(process.env.PORT ?? 5000),
};

if (!env.mongoUri) {
  throw new Error("MONGODB_URI is not set");
}
