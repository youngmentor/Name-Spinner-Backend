import mongoose from 'mongoose';
import Meeting from '../models/meeting';
import Participant from '../models/participant';

/**
 * Migration 001: Add Enterprise Fields to Existing Data
 * This migration safely adds new enterprise fields to existing meetings and participants
 */

export async function up() {
    console.log('Starting Migration 001: Adding enterprise fields...');

    try {
        // Add new fields to existing meetings
        const meetingUpdateResult = await Meeting.updateMany(
            {
                $or: [
                    { status: { $exists: false } },
                    { settings: { $exists: false } },
                    { statistics: { $exists: false } }
                ]
            },
            {
                $set: {
                    status: 'active',
                    settings: {
                        spinDuration: 3000,
                        excludeRecentlySelected: true,
                        allowManualSelection: false,
                        selectionMethod: 'random'
                    },
                    statistics: {
                        totalSpins: 0,
                        totalParticipants: 0,
                        averageSpinDuration: 0
                    }
                }
            }
        );

        console.log(`Updated ${meetingUpdateResult.modifiedCount} meetings with enterprise fields`);

        // Add new fields to existing participants
        const participantUpdateResult = await Participant.updateMany(
            {
                $or: [
                    { department: { $exists: false } },
                    { isActive: { $exists: false } },
                    { totalMeetings: { $exists: false } },
                    { metadata: { $exists: false } }
                ]
            },
            {
                $set: {
                    department: 'General', // Default department
                    isActive: true,
                    totalMeetings: 1,
                    metadata: new Map()
                }
            }
        );

        console.log(`Updated ${participantUpdateResult.modifiedCount} participants with enterprise fields`);

        // Update participant counts in meetings based on existing data
        const meetings = await Meeting.find({});
        for (const meeting of meetings) {
            const participantCount = meeting.participants ? meeting.participants.length : 0;
            await Meeting.findByIdAndUpdate(meeting._id, {
                $set: {
                    'statistics.totalParticipants': participantCount
                }
            });
        }

        console.log('Migration 001 completed successfully');
        return true;
    } catch (error) {
        console.error('Error in Migration 001:', error);
        throw error;
    }
}

export async function down() {
    console.log('Starting Migration 001 rollback...');

    try {
        // Remove enterprise fields from meetings
        await Meeting.updateMany(
            {},
            {
                $unset: {
                    teamId: 1,
                    status: 1,
                    settings: 1,
                    statistics: 1
                }
            }
        );

        // Remove enterprise fields from participants
        await Participant.updateMany(
            {},
            {
                $unset: {
                    meetingId: 1,
                    teamId: 1,
                    isActive: 1,
                    avatar: 1,
                    totalMeetings: 1,
                    metadata: 1
                }
            }
        );

        console.log('Migration 001 rollback completed');
        return true;
    } catch (error) {
        console.error('Error in Migration 001 rollback:', error);
        throw error;
    }
}

export default { up, down };
