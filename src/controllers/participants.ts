import { RequestHandler } from 'express';
import Participant from '../models/participant';
import mongoose from "mongoose"

export const getParticipants: RequestHandler = async (req, res) => {
    try {
        const filter = req.query.department ? { department: req.query.department } : {};
        const participants = await Participant.find(filter).sort({ name: 1 });
        res.json({
            messgge: "Participant Loaded successfully ",
            participants
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching participants' });
    }
};

export const createParticipants: RequestHandler = async (req, res) => {
    try {
        const participants = req.body.participants;

        if (!Array.isArray(participants) || !participants.length) {
            res.status(400).json({ error: 'Invalid participants data' });
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
            department: participants[0].department
        }).sort({ name: 1 });

        res.json(allParticipants);
    } catch (error) {
        res.status(500).json({ error: 'Error creating participants' });
    }
};
export const getParticipantById: RequestHandler = async (req, res) => {
    try {
        const participant = await Participant.findById(req.params.id);
        if (!participant) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        res.json(participant);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching participant' });
    }
};

export const updateParticipant: RequestHandler = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ error: "Invalid participant ID" });
            return;
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({ error: "No update data provided" });
            return;
        }
        const participant = await Participant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!participant) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        res.json({ message: "Participant updated successfully", participant });
    } catch (error) {
        res.status(500).json({ error: 'Error updating participant' });
    }
};

export const deleteParticipant: RequestHandler = async (req, res) => {
    try {
        const participant = await Participant.findByIdAndDelete(req.params.id);
        if (!participant) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        res.json({ message: 'Participant deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting participant' });
    }
};