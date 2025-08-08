import mongoose from 'mongoose';
import SelectionHistory from '../models/selectionHistory';
import SelectionRecord from '../models/SelectionRecord';
import Participant from '../models/participant';

/**
 * Migration 002: Migrate Selection History to Enhanced Selection Records
 * This migration safely migrates data from the old SelectionHistory model to the new SelectionRecord model
 */

export async function up() {
    console.log('Starting Migration 002: Migrating selection history...');

    try {
        // Get all existing selection history records
        const historyRecords = await SelectionHistory.find({}).lean();

        if (historyRecords.length === 0) {
            console.log('No selection history records found to migrate');
            return true;
        }

        console.log(`Found ${historyRecords.length} selection history records to migrate`);

        // Create new SelectionRecord entries
        const selectionRecords = historyRecords.map(record => ({
            meetingId: record.meetingId,
            participantId: record.participantId,
            participantName: record.participantName,
            department: record.department || 'General',
            selectedAt: record.selectedAt,
            selectionMethod: 'random' as const,
            metadata: {
                migrated: true,
                originalId: record._id
            }
        }));

        // Insert in batches to avoid memory issues
        const batchSize = 1000;
        let insertedCount = 0;

        for (let i = 0; i < selectionRecords.length; i += batchSize) {
            const batch = selectionRecords.slice(i, i + batchSize);
            await SelectionRecord.insertMany(batch, { ordered: false });
            insertedCount += batch.length;
            console.log(`Migrated ${insertedCount}/${selectionRecords.length} records`);
        }

        // Update participant selection counts based on migrated records
        console.log('Updating participant selection counts...');

        const participantCounts = await SelectionRecord.aggregate([
            { $match: { 'metadata.migrated': true } },
            {
                $group: {
                    _id: '$participantId',
                    count: { $sum: 1 },
                    lastSelected: { $max: '$selectedAt' }
                }
            }
        ]);

        for (const { _id: participantId, count, lastSelected } of participantCounts) {
            await Participant.findByIdAndUpdate(participantId, {
                $set: {
                    selectionCount: count,
                    lastSelected: lastSelected
                }
            });
        }

        console.log(`Updated selection counts for ${participantCounts.length} participants`);
        console.log('Migration 002 completed successfully');
        return true;
    } catch (error) {
        console.error('Error in Migration 002:', error);
        throw error;
    }
}

export async function down() {
    console.log('Starting Migration 002 rollback...');

    try {
        // Remove migrated selection records
        const deleteResult = await SelectionRecord.deleteMany({
            'metadata.migrated': true
        });

        console.log(`Removed ${deleteResult.deletedCount} migrated selection records`);

        // Reset participant counts
        await Participant.updateMany(
            {},
            {
                $set: {
                    selectionCount: 0,
                    lastSelected: null
                }
            }
        );

        console.log('Migration 002 rollback completed');
        return true;
    } catch (error) {
        console.error('Error in Migration 002 rollback:', error);
        throw error;
    }
}

export default { up, down };
