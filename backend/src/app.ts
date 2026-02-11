import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", routes);
  return app;
};
