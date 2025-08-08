import { Router, RequestHandler } from 'express';
import Meeting from '../models/meeting';
import Participant from "../models/participant";
import SelectionRecord from '../models/SelectionRecord';
import { Readable } from "stream";
import csv from "csv-parser";
import * as XLSX from "xlsx";
import mongoose from 'mongoose';


export const getAllMeetings: RequestHandler = async (req, res) => {
    try {
        const filter: any = {};

        // Enhanced filtering options
        if (req.query.department) filter.department = req.query.department;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.teamId) filter.teamId = req.query.teamId;

        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const meetings = await Meeting.find(filter)
            .populate('teamId', 'name color')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get enhanced meeting data with statistics
        const enhancedMeetings = await Promise.all(
            meetings.map(async (meeting) => {
                const [participantCount, recentSelections] = await Promise.all([
                    Participant.countDocuments({ meetingId: meeting._id, isActive: true }),
                    SelectionRecord.countDocuments({ meetingId: meeting._id })
                ]);

                return {
                    ...meeting,
                    participantCount,
                    totalSelections: recentSelections,
                    team: meeting.teamId ? {
                        id: (meeting.teamId as any)._id,
                        name: (meeting.teamId as any).name,
                        color: (meeting.teamId as any).color
                    } : null
                };
            })
        );

        const total = await Meeting.countDocuments(filter);

        res.json({
            meetings: enhancedMeetings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({
            error: 'Error fetching meetings',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const addParticipantsToMeeting: RequestHandler = async (req, res) => {
    try {
        const { meetingId } = req.params;
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
                    selectionCount: 0,
                }))
                .filter((p) => p.name);
        } else {
            res.status(400).json({ error: "Unsupported file format" });
            return;
        }
        if (participants.length === 0) {
            res.status(404).json({ error: 'No participants found' });
            return;
        }

        await Participant.bulkWrite(
            participants.map((p) => ({
                updateOne: {
                    filter: { name: p.name, email: p.email },
                    update: { $set: p },
                    upsert: true
                }
            }))
        );

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        // Get all participants we just added/updated
        const addedParticipants = await Participant.find({
            email: { $in: participants.map(p => p.email) }
        }).sort({ name: 1 });

        const uniqueParticipants = [
            ...new Map(
                [...meeting.participants, ...addedParticipants].map((p) => [p.email, p])
            ).values()
        ];

        meeting.participants = uniqueParticipants;
        await meeting.save()
        res.json({ message: "Participants added successfully", meeting });
    } catch (error) {
        res.status(500).json({ error: "Error adding participants to meeting" });
        console.log(error)
    }
};
export const getOneMeetingParticipants: RequestHandler = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const meeting = await Meeting.findById(meetingId).populate("participants");

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        res.json({ message: `All Participants  Loaded successfullly for ${meeting.department}`, participants: meeting.participants });
    } catch (error) {
        console.error("Error fetching meeting participants:", error);
        res.status(500).json({ error: "Server error" });
    }
};

export const createMeeting: RequestHandler = async (req, res) => {
    try {
        const meeting = new Meeting(req.body);
        await meeting.save();
        res.status(201).json(meeting);
    } catch (error) {
        res.status(500).json({ error: 'Error creating meeting' });
    }
};

export const getMeetingById: RequestHandler = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
            .populate('teamId', 'name color description');

        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        // Get enhanced statistics
        const [participantCount, recentSelections, totalSelections] = await Promise.all([
            Participant.countDocuments({ meetingId: meeting._id, isActive: true }),
            SelectionRecord.find({ meetingId: meeting._id })
                .sort({ selectedAt: -1 })
                .limit(5)
                .populate('participantId', 'name department'),
            SelectionRecord.countDocuments({ meetingId: meeting._id })
        ]);

        // Calculate average selection duration
        const avgDurationResult = await SelectionRecord.aggregate([
            { $match: { meetingId: new mongoose.Types.ObjectId(meeting._id as string) } },
            { $match: { selectionDuration: { $exists: true, $ne: null } } },
            { $group: { _id: null, avg: { $avg: '$selectionDuration' } } }
        ]);

        const response = {
            ...meeting.toObject(),
            participantCount,
            totalSelections,
            recentSelections: recentSelections.map(sel => ({
                id: sel._id,
                participantName: sel.participantName,
                department: sel.department,
                selectedAt: sel.selectedAt,
                participant: sel.participantId ? {
                    name: (sel.participantId as any).name,
                    department: (sel.participantId as any).department
                } : null
            })),
            statistics: {
                ...meeting.statistics,
                totalSelections,
                averageSelectionDuration: avgDurationResult[0]?.avg || 0
            },
            team: meeting.teamId ? {
                id: (meeting.teamId as any)._id,
                name: (meeting.teamId as any).name,
                color: (meeting.teamId as any).color,
                description: (meeting.teamId as any).description
            } : null
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({
            error: 'Error fetching meeting',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const updateMeeting: RequestHandler = async (req, res) => {
    try {
        const meeting = await Meeting.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }
        res.json(meeting);
    } catch (error) {
        res.status(500).json({ error: 'Error updating meeting' });
    }
};

export const deleteMeeting: RequestHandler = async (req, res) => {
    try {
        const meeting = await Meeting.findByIdAndDelete(req.params.id);
        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }
        res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting meeting' });
    }
};
