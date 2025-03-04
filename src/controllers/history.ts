import { RequestHandler } from 'express';

import SelectionHistory from '../models/selectionHistory';
import Participant from '../models/participant';
import mongoose from 'mongoose';

export const getSelectionHistory: RequestHandler = async (req, res) => {
    try {
        const filter: any = {};

        if (req.query.department) filter.department = req.query.department;
        if (req.query.meetingId) filter.meetingId = req.query.meetingId;
        if (req.query.participantId) filter.participantId = req.query.participantId;

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const history = await SelectionHistory.find(filter).sort({ selectedAt: -1 }).limit(limit);

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching selection history' });
    }
};

export const createSelectionRecord: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { meetingId, meetingName, department, participantId, participantName } = req.body;

        if (!meetingId || !meetingName || !department || !participantId || !participantName) {
            await session.abortTransaction();
            res.status(400).json({ error: 'Missing required fields' });
            return
        }

        const participant = await Participant.findById(participantId).session(session);
        if (!participant) {
            await session.abortTransaction();
            res.status(404).json({ error: 'Participant not found' });
            return
        }
        const historyEntry = new SelectionHistory({
            meetingId,
            meetingName,
            department,
            participantId,
            participantName,
            selectedAt: new Date()
        });

        await historyEntry.save({ session });

        // Update participant's selection count and lastSelected date
        await Participant.findByIdAndUpdate(
            participantId,
            { $inc: { selectionCount: 1 }, $set: { lastSelected: new Date() } },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(historyEntry);
    } catch (error) {
        await session.abortTransaction();
        console.error('Error in createSelectionRecord:', error); // Log the full error
        res.status(500).json({ error: 'Error creating selection record' });
    } finally {
        session.endSession();
    }
};

export const selectParticipant: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { meetingId, meetingName, department, excludeRecentlySelected } = req.body;
        let query = { department };
        let participants = await Participant.find(query).session(session);

        if (excludeRecentlySelected) {
            participants.sort((a, b) =>
                (a.lastSelected ? new Date(a.lastSelected).getTime() : 0) -
                (b.lastSelected ? new Date(b.lastSelected).getTime() : 0)
            );

            const neverSelected = participants.filter(p => !p.lastSelected);
            if (neverSelected.length > 0) {
                participants = neverSelected;
            } else {
                participants = participants.slice(0, Math.ceil(participants.length / 2));
            }
        }


        if (participants.length === 0) {
            await session.abortTransaction();
            res.status(404).json({ error: 'No eligible participants found' });
            return;
        }

        const randomIndex = Math.floor(Math.random() * participants.length);
        const selectedParticipant = participants[randomIndex];

        const historyEntry = new SelectionHistory({
            meetingId,
            meetingName,
            department,
            participantId: selectedParticipant._id,
            participantName: selectedParticipant.name,
            selectedAt: new Date()
        });

        await historyEntry.save({ session });
        await Participant.findByIdAndUpdate(
            selectedParticipant._id,
            { $inc: { selectionCount: 1 }, $set: { lastSelected: new Date() } },
            { session }
        );

        await session.commitTransaction();
        res.json({ selection: selectedParticipant, historyRecord: historyEntry });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Error selecting participant' });
    } finally {
        session.endSession();
    }
};

export const clearSelectionHistory: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const filter: any = req.query.department ? { department: req.query.department } : {};

        await SelectionHistory.deleteMany(filter).session(session);
        await Participant.updateMany(filter, { $set: { selectionCount: 0, lastSelected: null } }).session(session);

        await session.commitTransaction();
        res.json({ message: 'Selection history cleared successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Error clearing selection history' });
    } finally {
        session.endSession();
    }
};