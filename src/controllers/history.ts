import { RequestHandler } from 'express';

import SelectionHistory from '../models/selectionHistory';
import SelectionRecord from '../models/SelectionRecord';
import Participant from '../models/participant';
import Meeting from '../models/meeting';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const getSelectionHistory: RequestHandler = async (req, res) => {
    try {
        const filter: any = {};

        if (req.query.department) filter.department = req.query.department;
        if (req.query.meetingId) filter.meetingId = req.query.meetingId;
        if (req.query.participantId) filter.participantId = req.query.participantId;

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        // Use new SelectionRecord model but return in backward-compatible format
        const records = await SelectionRecord.find(filter)
            .sort({ selectedAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate('participantId', 'name email')
            .populate('meetingId', 'name');

        // Transform to old format for backward compatibility
        const oldFormat = records.map(record => ({
            id: record._id,
            meetingId: record.meetingId,
            meetingName: record.meetingId ? (record.meetingId as any).name : 'Unknown Meeting',
            department: record.department,
            participantId: record.participantId,
            participantName: record.participantName,
            selectedAt: record.selectedAt,
            // Enhanced fields (optional for new features)
            selectionDuration: record.selectionDuration,
            selectionMethod: record.selectionMethod,
            sessionId: record.sessionId,
            metadata: record.metadata
        }));

        res.json(oldFormat);
    } catch (error) {
        console.error('Error fetching selection history:', error);
        res.status(500).json({
            error: 'Error fetching selection history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const createSelectionRecord: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            meetingId,
            meetingName,
            department,
            participantId,
            participantName,
            selectionDuration,
            selectionMethod = 'random',
            sessionId,
            metadata
        } = req.body;

        if (!meetingId || !participantId || !participantName) {
            await session.abortTransaction();
            res.status(400).json({ error: 'Missing required fields: meetingId, participantId, participantName' });
            return;
        }

        // Get meeting and participant info
        const [meeting, participant] = await Promise.all([
            Meeting.findById(meetingId).session(session),
            Participant.findById(participantId).session(session)
        ]);

        if (!participant) {
            await session.abortTransaction();
            res.status(404).json({ error: 'Participant not found' });
            return;
        }

        const finalDepartment = department || participant.department || 'General';
        const finalMeetingName = meetingName || meeting?.name || 'Unknown Meeting';

        // Create new SelectionRecord (enhanced model)
        const selectionRecord = new SelectionRecord({
            meetingId,
            participantId,
            participantName,
            department: finalDepartment,
            teamId: participant.teamId,
            selectionDuration,
            sessionId: sessionId || uuidv4(),
            selectionMethod,
            metadata: {
                ...metadata,
                created: 'api'
            },
            selectedAt: new Date()
        });

        await selectionRecord.save({ session });

        // Update participant statistics
        await Participant.findByIdAndUpdate(
            participantId,
            {
                $inc: { selectionCount: 1 },
                $set: { lastSelected: new Date() }
            },
            { session }
        );

        // Update meeting statistics
        if (meeting) {
            await Meeting.findByIdAndUpdate(
                meetingId,
                {
                    $inc: { 'statistics.totalSpins': 1 },
                    $set: { 'statistics.lastActivity': new Date() }
                },
                { session }
            );
        }

        await session.commitTransaction();

        res.status(201).json({
            message: 'Selection record created successfully',
            data: {
                id: selectionRecord._id,
                meetingId: selectionRecord.meetingId,
                meetingName: finalMeetingName,
                department: selectionRecord.department,
                participantId: selectionRecord.participantId,
                participantName: selectionRecord.participantName,
                selectedAt: selectionRecord.selectedAt,
                // Enhanced fields
                selectionDuration: selectionRecord.selectionDuration,
                selectionMethod: selectionRecord.selectionMethod,
                sessionId: selectionRecord.sessionId
            }
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error in createSelectionRecord:', error);
        res.status(500).json({
            error: 'Error creating selection record',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        session.endSession();
    }
};

export const selectParticipant: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            meetingId,
            meetingName,
            department,
            excludeRecentlySelected = true,
            selectionMethod = 'random',
            spinDuration
        } = req.body;

        if (!meetingId || !department) {
            await session.abortTransaction();
            res.status(400).json({ error: 'meetingId and department are required' });
            return;
        }

        // Get meeting info
        const meeting = await Meeting.findById(meetingId).session(session);
        if (!meeting) {
            await session.abortTransaction();
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        // Build participant query
        let query: any = { department, isActive: true };

        // If meeting has specific participants, use them
        if (meeting.participants && meeting.participants.length > 0) {
            const participantEmails = meeting.participants.map(p => p.email).filter(Boolean);
            if (participantEmails.length > 0) {
                query.email = { $in: participantEmails };
            }
        }

        let participants = await Participant.find(query).session(session);

        if (participants.length === 0) {
            await session.abortTransaction();
            res.status(404).json({ error: 'No eligible participants found' });
            return;
        }

        // Apply selection logic
        if (excludeRecentlySelected) {
            participants.sort((a, b) =>
                (a.lastSelected ? new Date(a.lastSelected).getTime() : 0) -
                (b.lastSelected ? new Date(b.lastSelected).getTime() : 0)
            );

            const neverSelected = participants.filter(p => !p.lastSelected);
            if (neverSelected.length > 0) {
                participants = neverSelected;
            } else {
                // Use least recently selected half
                participants = participants.slice(0, Math.ceil(participants.length / 2));
            }
        }

        // Select participant based on method
        let selectedParticipant;
        switch (selectionMethod) {
            case 'weighted':
                // Weighted selection (favor less selected participants)
                const weights = participants.map(p => {
                    const maxSelections = Math.max(...participants.map(pp => pp.selectionCount));
                    return maxSelections - p.selectionCount + 1;
                });
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                const randomWeight = Math.random() * totalWeight;

                let weightSum = 0;
                for (let i = 0; i < participants.length; i++) {
                    weightSum += weights[i];
                    if (randomWeight <= weightSum) {
                        selectedParticipant = participants[i];
                        break;
                    }
                }
                break;

            case 'manual':
                // For manual selection, return all eligible participants
                await session.commitTransaction();
                res.json({
                    eligibleParticipants: participants.map(p => ({
                        id: p._id,
                        name: p.name,
                        department: p.department,
                        selectionCount: p.selectionCount,
                        lastSelected: p.lastSelected
                    }))
                });
                return;

            default: // random
                const randomIndex = Math.floor(Math.random() * participants.length);
                selectedParticipant = participants[randomIndex];
        }

        if (!selectedParticipant) {
            await session.abortTransaction();
            res.status(500).json({ error: 'Failed to select participant' });
            return;
        }

        // Create enhanced selection record
        const sessionId = uuidv4();
        const selectionRecord = new SelectionRecord({
            meetingId,
            participantId: selectedParticipant._id,
            participantName: selectedParticipant.name,
            department: selectedParticipant.department,
            teamId: selectedParticipant.teamId,
            selectionDuration: spinDuration,
            sessionId,
            selectionMethod,
            metadata: {
                excludedRecentlySelected: excludeRecentlySelected,
                totalEligible: participants.length,
                spinDuration,
                selectionRound: 1
            },
            selectedAt: new Date()
        });

        await selectionRecord.save({ session });

        // Update participant
        await Participant.findByIdAndUpdate(
            selectedParticipant._id,
            {
                $inc: { selectionCount: 1 },
                $set: { lastSelected: new Date() }
            },
            { session }
        );

        // Update meeting statistics
        await Meeting.findByIdAndUpdate(
            meetingId,
            {
                $inc: { 'statistics.totalSpins': 1 },
                $set: { 'statistics.lastActivity': new Date() }
            },
            { session }
        );

        await session.commitTransaction();

        res.json({
            selection: {
                id: selectedParticipant._id,
                name: selectedParticipant.name,
                email: selectedParticipant.email,
                role: selectedParticipant.role,
                department: selectedParticipant.department,
                selectionCount: selectedParticipant.selectionCount + 1,
                lastSelected: new Date()
            },
            historyRecord: {
                id: selectionRecord._id,
                meetingId: selectionRecord.meetingId,
                meetingName: meetingName || meeting.name,
                department: selectionRecord.department,
                participantId: selectionRecord.participantId,
                participantName: selectionRecord.participantName,
                selectedAt: selectionRecord.selectedAt,
                sessionId: selectionRecord.sessionId,
                selectionMethod: selectionRecord.selectionMethod
            }
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error selecting participant:', error);
        res.status(500).json({
            error: 'Error selecting participant',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        session.endSession();
    }
};

export const clearSelectionHistory: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const filter: any = {};

        if (req.query.department) {
            filter.department = req.query.department;
        }
        if (req.query.meetingId) {
            filter.meetingId = req.query.meetingId;
        }

        // Clear from new SelectionRecord model
        await SelectionRecord.deleteMany(filter).session(session);

        // Clear from old SelectionHistory model (for backward compatibility)
        await SelectionHistory.deleteMany(filter).session(session);

        // Reset participant statistics
        const participantFilter: any = {};
        if (req.query.department) {
            participantFilter.department = req.query.department;
        }
        if (req.query.meetingId) {
            participantFilter.meetingId = req.query.meetingId;
        }

        await Participant.updateMany(
            participantFilter,
            {
                $set: {
                    selectionCount: 0,
                    lastSelected: null
                }
            }
        ).session(session);

        // Reset meeting statistics if specific meeting
        if (req.query.meetingId) {
            await Meeting.findByIdAndUpdate(
                req.query.meetingId,
                {
                    $set: {
                        'statistics.totalSpins': 0,
                        'statistics.lastActivity': null
                    }
                }
            ).session(session);
        }

        await session.commitTransaction();
        res.json({
            message: 'Selection history cleared successfully',
            cleared: {
                department: req.query.department || 'all',
                meetingId: req.query.meetingId || 'all'
            }
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error clearing selection history:', error);
        res.status(500).json({
            error: 'Error clearing selection history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        session.endSession();
    }
};