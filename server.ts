// server.ts - Express server setup
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";

import participantRoutes from './src/routes/participants'
import meetingRoutes from './src/routes/meetings';
import historyRoutes from './src/routes/history';
import uploadRoutes from './src/routes/upload'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/meeting-selection";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));


app.use("/api/participants", participantRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/history", historyRoutes);



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
