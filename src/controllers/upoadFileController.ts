import { Request, Response } from "express";
import { Readable } from "stream";
import csv from "csv-parser";
import * as XLSX from "xlsx";
import Participant from '../models/participant';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const buffer = req.file.buffer;
        const filename = req.file.originalname;
        let participants = [];

        if (filename.endsWith(".csv")) {
            const stream = Readable.from(buffer);
            const results: any[] = [];

            await new Promise((resolve, reject) => {
                stream
                    .pipe(csv())
                    .on("data", (data) => results.push(data))
                    .on("end", () => resolve(results))
                    .on("error", (err) => reject(err));
            });

            participants = results
                .map((row) => ({
                    name: row.name?.trim(),
                    role: row.role?.trim(),
                    email: row.email?.trim(),
                    department: req.body.department,
                    selectionCount: 0,
                }))
                .filter((p) => p.name);
        } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            const workbook = XLSX.read(buffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data: { [key: string]: any }[] = XLSX.utils.sheet_to_json(worksheet);

            participants = data
                .map((row) => ({
                    name: row.name?.toString().trim() || row.Name?.toString().trim(),
                    role: row.role?.toString().trim() || row.Role?.toString().trim(),
                    email: row.email?.toString().trim() || row.Email?.toString().trim(),
                    department: req.body.department,
                    selectionCount: 0,
                }))
                .filter((p) => p.name);
        } else {
            res.status(400).json({ error: "Unsupported file format" });
            return;
        }

        if (!participants.length) {
            res.status(400).json({ error: "No valid participant data found in file" });
            return;
        }
        await Participant.bulkWrite(
            participants.map((p) => ({
                updateOne: {
                    filter: { name: p.name, department: p.department },
                    update: { $set: p },
                    upsert: true
                }
            }))
        );

        const allParticipants = await Participant.find({
            department: req.body.department
        }).sort({ name: 1 });

        res.json({
            message: "File uploaded and imported successfully",
            participants: allParticipants
        });
    } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({ error: "Error processing file" });
    }
};
