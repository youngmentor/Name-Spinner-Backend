import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Participant from '../models/participant';
import Meeting from '../models/meeting';
import SelectionRecord from '../models/SelectionRecord';

/**
 * Get all teams
 */
export const getAllTeams: RequestHandler = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('leadId', 'name email')
            .populate('members.participantId', 'name email department')
            .lean();

        const teamsWithStats = await Promise.all(
            teams.map(async (team) => {
                // Get team statistics
                const [activeMeetings, totalSelections] = await Promise.all([
                    Meeting.countDocuments({ teamId: team._id, status: 'active' }),
                    SelectionRecord.countDocuments({ teamId: team._id })
                ]);

                // Calculate growth (this would be based on historical data)
                const growth = '+5%'; // Placeholder

                return {
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    members: team.members.length,
                    activeMeetings,
                    totalSelections,
                    growth,
                    color: team.color,
                    lead: team.leadId ? {
                        id: (team.leadId as any)._id,
                        name: (team.leadId as any).name,
                        email: (team.leadId as any).email
                    } : null,
                    lastActivity: team.updatedAt.toISOString(),
                    createdAt: team.createdAt.toISOString(),
                    updatedAt: team.updatedAt.toISOString()
                };
            })
        );

        res.json({ teams: teamsWithStats });
    } catch (error) {
        console.error('Error getting teams:', error);
        res.status(500).json({
            error: 'Error fetching teams',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Create a new team
 */
export const createTeam: RequestHandler = async (req, res) => {
    try {
        const { name, description, color, leadId } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Team name is required' });
            return;
        }

        const team = new Team({
            name: name.trim(),
            description: description?.trim(),
            color: color || 'blue',
            leadId: leadId || undefined
        });

        await team.save();

        // Populate lead information
        await team.populate('leadId', 'name email');

        res.status(201).json({
            message: 'Team created successfully',
            team: {
                id: team._id,
                name: team.name,
                description: team.description,
                color: team.color,
                lead: team.leadId ? {
                    id: (team.leadId as any)._id,
                    name: (team.leadId as any).name,
                    email: (team.leadId as any).email
                } : null,
                members: 0,
                activeMeetings: 0,
                totalSelections: 0,
                growth: '+0%',
                lastActivity: team.updatedAt.toISOString(),
                createdAt: team.createdAt.toISOString(),
                updatedAt: team.updatedAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({
            error: 'Error creating team',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get team by ID
 */
export const getTeamById: RequestHandler = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('leadId', 'name email')
            .populate('members.participantId', 'name email department');

        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Get team statistics
        const [activeMeetings, totalSelections] = await Promise.all([
            Meeting.countDocuments({ teamId: team._id, status: 'active' }),
            SelectionRecord.countDocuments({ teamId: team._id })
        ]);

        res.json({
            id: team._id,
            name: team.name,
            description: team.description,
            color: team.color,
            lead: team.leadId ? {
                id: (team.leadId as any)._id,
                name: (team.leadId as any).name,
                email: (team.leadId as any).email
            } : null,
            members: team.members.map(member => ({
                id: (member.participantId as any)._id,
                name: (member.participantId as any).name,
                email: (member.participantId as any).email,
                department: (member.participantId as any).department,
                role: member.role,
                joinedAt: member.joinedAt.toISOString()
            })),
            activeMeetings,
            totalSelections,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString()
        });
    } catch (error) {
        console.error('Error getting team:', error);
        res.status(500).json({
            error: 'Error fetching team',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Update team
 */
export const updateTeam: RequestHandler = async (req, res) => {
    try {
        const { name, description, color, leadId } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim();
        if (color) updateData.color = color;
        if (leadId !== undefined) updateData.leadId = leadId || undefined;

        const team = await Team.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('leadId', 'name email');

        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        res.json({
            message: 'Team updated successfully',
            team: {
                id: team._id,
                name: team.name,
                description: team.description,
                color: team.color,
                lead: team.leadId ? {
                    id: (team.leadId as any)._id,
                    name: (team.leadId as any).name,
                    email: (team.leadId as any).email
                } : null,
                createdAt: team.createdAt.toISOString(),
                updatedAt: team.updatedAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({
            error: 'Error updating team',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Delete team
 */
export const deleteTeam: RequestHandler = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const team = await Team.findById(req.params.id).session(session);
        if (!team) {
            await session.abortTransaction();
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Remove team reference from meetings
        await Meeting.updateMany(
            { teamId: team._id },
            { $unset: { teamId: 1 } },
            { session }
        );

        // Remove team reference from participants
        await Participant.updateMany(
            { teamId: team._id },
            { $unset: { teamId: 1 } },
            { session }
        );

        // Remove team reference from selection records
        await SelectionRecord.updateMany(
            { teamId: team._id },
            { $unset: { teamId: 1 } },
            { session }
        );

        // Delete the team
        await Team.findByIdAndDelete(req.params.id).session(session);

        await session.commitTransaction();
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error deleting team:', error);
        res.status(500).json({
            error: 'Error deleting team',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        session.endSession();
    }
};

/**
 * Get team members
 */
export const getTeamMembers: RequestHandler = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('members.participantId', 'name email department selectionCount lastSelected');

        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        const members = team.members.map(member => ({
            id: (member.participantId as any)._id,
            name: (member.participantId as any).name,
            email: (member.participantId as any).email,
            department: (member.participantId as any).department,
            role: member.role,
            selectionCount: (member.participantId as any).selectionCount,
            lastSelected: (member.participantId as any).lastSelected,
            joinedAt: member.joinedAt.toISOString()
        }));

        res.json({ members });
    } catch (error) {
        console.error('Error getting team members:', error);
        res.status(500).json({
            error: 'Error fetching team members',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Add team member
 */
export const addTeamMember: RequestHandler = async (req, res) => {
    try {
        const { participantId, role } = req.body;

        if (!participantId) {
            res.status(400).json({ error: 'Participant ID is required' });
            return;
        }

        const team = await Team.findById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        const participant = await Participant.findById(participantId);
        if (!participant) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }

        // Check if participant is already a member
        const existingMember = team.members.find(
            member => member.participantId.toString() === participantId
        );

        if (existingMember) {
            res.status(400).json({ error: 'Participant is already a team member' });
            return;
        }

        // Add member to team
        team.members.push({
            participantId: new mongoose.Types.ObjectId(participantId),
            role: role || 'member',
            joinedAt: new Date()
        });

        await team.save();

        // Update participant's team reference
        participant.teamId = team._id as mongoose.Types.ObjectId;
        await participant.save();

        res.json({
            message: 'Team member added successfully',
            member: {
                id: participant._id,
                name: participant.name,
                email: participant.email,
                department: participant.department,
                role: role || 'member',
                joinedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(500).json({
            error: 'Error adding team member',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Remove team member
 */
export const removeTeamMember: RequestHandler = async (req, res) => {
    try {
        const { memberId } = req.params;

        const team = await Team.findById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Remove member from team
        const memberIndex = team.members.findIndex(
            member => member.participantId.toString() === memberId
        );

        if (memberIndex === -1) {
            res.status(404).json({ error: 'Member not found in team' });
            return;
        }

        team.members.splice(memberIndex, 1);
        await team.save();

        // Remove team reference from participant
        await Participant.findByIdAndUpdate(
            memberId,
            { $unset: { teamId: 1 } }
        );

        res.json({ message: 'Team member removed successfully' });
    } catch (error) {
        console.error('Error removing team member:', error);
        res.status(500).json({
            error: 'Error removing team member',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get team performance metrics
 */
export const getTeamPerformance: RequestHandler = async (req, res) => {
    try {
        const teamId = new mongoose.Types.ObjectId(req.params.id);

        const [
            totalSelections,
            averageParticipation,
            topPerformers,
            weeklyActivity
        ] = await Promise.all([
            SelectionRecord.countDocuments({ teamId }),

            // Calculate average participation
            SelectionRecord.aggregate([
                { $match: { teamId } },
                { $group: { _id: '$participantId' } },
                { $count: 'participantCount' }
            ]),

            // Get top performers
            SelectionRecord.aggregate([
                { $match: { teamId } },
                {
                    $group: {
                        _id: '$participantId',
                        selectionCount: { $sum: 1 },
                        participantName: { $first: '$participantName' },
                        department: { $first: '$department' }
                    }
                },
                { $sort: { selectionCount: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        name: '$participantName',
                        department: 1,
                        selections: '$selectionCount'
                    }
                }
            ]),

            // Get weekly activity
            SelectionRecord.aggregate([
                {
                    $match: {
                        teamId,
                        selectedAt: {
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$selectedAt" } },
                        selections: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ])
        ]);

        const avgParticipation = averageParticipation[0]?.participantCount || 0;

        res.json({
            totalSelections,
            averageParticipation: avgParticipation,
            topPerformers,
            weeklyActivity
        });
    } catch (error) {
        console.error('Error getting team performance:', error);
        res.status(500).json({
            error: 'Error fetching team performance',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
