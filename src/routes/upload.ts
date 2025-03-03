import express from "express";
import multer from "multer";
import { uploadFile } from "../controllers/upoadFileController";

const router = express.Router();
const upload = multer();

router.post("/", upload.single("file"), uploadFile);

export default router;
