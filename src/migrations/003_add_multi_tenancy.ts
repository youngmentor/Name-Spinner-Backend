import mongoose from 'mongoose';
import Organization from '../models/Organization';
import User from '../models/User';
import Meeting from '../models/meeting';
import Participant from '../models/participant';
import Team from '../models/Team';
import SelectionRecord from '../models/SelectionRecord';
import ExportJob from '../models/ExportJob';
import DailyStats from '../models/DailyStats';

/**
 * Migration: Add Multi-Tenancy Support
 * 
 * This migration:
 * 1. Creates a default organization for existing data
 * 2. Adds organizationId to all existing records
 * 3. Migrates existing users to the default organization
 */

export async function up(): Promise<void> {
    console.log('🚀 Starting multi-tenancy migration...');

    try {
        // Step 1: Create default organization if it doesn't exist
        let defaultOrg = await Organization.findOne({ slug: 'default' });

        if (!defaultOrg) {
            console.log('📝 Creating default organization...');
            defaultOrg = new Organization({
                name: 'Default Organization',
                slug: 'default',
                description: 'Default organization for migrated data',
                size: 'medium',
                subscription: {
                    plan: 'enterprise',
                    status: 'active',
                    maxUsers: 1000,
                    features: ['basicAnalytics', 'export', 'teams', 'advancedSettings', 'advancedAnalytics', 'customBranding', 'apiAccess']
                },
                settings: {
                    allowTeamCreation: true,
                    enableAdvancedAnalytics: true,
                    enableExport: true,
                    customBranding: false,
                    apiAccess: true,
                    retentionDays: 365
                }
            });
            await defaultOrg.save();
            console.log('✅ Default organization created');
        } else {
            console.log('ℹ️  Default organization already exists');
        }

        const defaultOrgId = defaultOrg._id;

        // Step 2: Migrate Users
        const usersWithoutOrg = await User.countDocuments({ organizationId: { $exists: false } });
        if (usersWithoutOrg > 0) {
            console.log(`📝 Migrating ${usersWithoutOrg} users...`);

            // Add organizationId to existing users and set first user as owner
            const firstUser = await User.findOne({}).sort({ createdAt: 1 });

            if (firstUser) {
                await User.updateOne(
                    { _id: firstUser._id },
                    {
                        $set: {
                            organizationId: defaultOrgId,
                            organizationRole: 'owner',
                            isActive: true,
                            permissions: {
                                canCreateMeetings: true,
                                canManageTeams: true,
                                canViewAnalytics: true,
                                canExportData: true,
                                canManageUsers: true,
                                canManageOrganization: true
                            }
                        }
                    }
                );
            }

            // Update remaining users
            await User.updateMany(
                { organizationId: { $exists: false }, _id: { $ne: firstUser?._id } },
                {
                    $set: {
                        organizationId: defaultOrgId,
                        organizationRole: 'member',
                        isActive: true,
                        permissions: {
                            canCreateMeetings: true,
                            canManageTeams: false,
                            canViewAnalytics: false,
                            canExportData: false,
                            canManageUsers: false,
                            canManageOrganization: false
                        }
                    }
                }
            );

            console.log('✅ Users migrated');
        }

        // Step 3: Migrate Meetings
        const meetingsWithoutOrg = await Meeting.countDocuments({ organizationId: { $exists: false } });
        if (meetingsWithoutOrg > 0) {
            console.log(`📝 Migrating ${meetingsWithoutOrg} meetings...`);
            await Meeting.updateMany(
                { organizationId: { $exists: false } },
                { $set: { organizationId: defaultOrgId } }
            );
            console.log('✅ Meetings migrated');
        }

        // Step 4: Migrate Participants
        const participantsWithoutOrg = await Participant.countDocuments({ organizationId: { $exists: false } });
        if (participantsWithoutOrg > 0) {
            console.log(`📝 Migrating ${participantsWithoutOrg} participants...`);
            await Participant.updateMany(
                { organizationId: { $exists: false } },
                {
                    $set: {
                        organizationId: defaultOrgId,
                        isActive: true,
                        totalMeetings: 1
                    }
                }
            );
            console.log('✅ Participants migrated');
        }

        // Step 5: Migrate Teams
        const teamsWithoutOrg = await Team.countDocuments({ organizationId: { $exists: false } });
        if (teamsWithoutOrg > 0) {
            console.log(`📝 Migrating ${teamsWithoutOrg} teams...`);
            await Team.updateMany(
                { organizationId: { $exists: false } },
                { $set: { organizationId: defaultOrgId } }
            );
            console.log('✅ Teams migrated');
        }

        // Step 6: Migrate Selection Records
        const recordsWithoutOrg = await SelectionRecord.countDocuments({ organizationId: { $exists: false } });
        if (recordsWithoutOrg > 0) {
            console.log(`📝 Migrating ${recordsWithoutOrg} selection records...`);
            await SelectionRecord.updateMany(
                { organizationId: { $exists: false } },
                { $set: { organizationId: defaultOrgId } }
            );
            console.log('✅ Selection records migrated');
        }

        // Step 7: Migrate Export Jobs
        const exportsWithoutOrg = await ExportJob.countDocuments({ organizationId: { $exists: false } });
        if (exportsWithoutOrg > 0) {
            console.log(`📝 Migrating ${exportsWithoutOrg} export jobs...`);
            await ExportJob.updateMany(
                { organizationId: { $exists: false } },
                { $set: { organizationId: defaultOrgId } }
            );
            console.log('✅ Export jobs migrated');
        }

        // Step 8: Migrate Daily Stats
        const statsWithoutOrg = await DailyStats.countDocuments({ organizationId: { $exists: false } });
        if (statsWithoutOrg > 0) {
            console.log(`📝 Migrating ${statsWithoutOrg} daily stats...`);
            await DailyStats.updateMany(
                { organizationId: { $exists: false } },
                { $set: { organizationId: defaultOrgId } }
            );
            console.log('✅ Daily stats migrated');
        }

        console.log('🎉 Multi-tenancy migration completed successfully!');

        // Summary
        const finalCounts = {
            organizations: await Organization.countDocuments(),
            users: await User.countDocuments({ organizationId: defaultOrgId }),
            meetings: await Meeting.countDocuments({ organizationId: defaultOrgId }),
            participants: await Participant.countDocuments({ organizationId: defaultOrgId }),
            teams: await Team.countDocuments({ organizationId: defaultOrgId }),
            selections: await SelectionRecord.countDocuments({ organizationId: defaultOrgId }),
            exports: await ExportJob.countDocuments({ organizationId: defaultOrgId }),
            dailyStats: await DailyStats.countDocuments({ organizationId: defaultOrgId })
        };

        console.log('📊 Migration Summary:');
        console.log(`   - Organizations: ${finalCounts.organizations}`);
        console.log(`   - Users: ${finalCounts.users}`);
        console.log(`   - Meetings: ${finalCounts.meetings}`);
        console.log(`   - Participants: ${finalCounts.participants}`);
        console.log(`   - Teams: ${finalCounts.teams}`);
        console.log(`   - Selection Records: ${finalCounts.selections}`);
        console.log(`   - Export Jobs: ${finalCounts.exports}`);
        console.log(`   - Daily Stats: ${finalCounts.dailyStats}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

export async function down(): Promise<void> {
    console.log('🔄 Rolling back multi-tenancy migration...');

    try {
        // Remove organizationId from all collections
        await User.updateMany({}, { $unset: { organizationId: 1, organizationRole: 1, isActive: 1, permissions: 1, auth: 1 } });
        await Meeting.updateMany({}, { $unset: { organizationId: 1 } });
        await Participant.updateMany({}, { $unset: { organizationId: 1, isActive: 1, totalMeetings: 1 } });
        await Team.updateMany({}, { $unset: { organizationId: 1 } });
        await SelectionRecord.updateMany({}, { $unset: { organizationId: 1 } });
        await ExportJob.updateMany({}, { $unset: { organizationId: 1 } });
        await DailyStats.updateMany({}, { $unset: { organizationId: 1 } });

        // Remove default organization
        await Organization.deleteOne({ slug: 'default' });

        console.log('✅ Multi-tenancy migration rolled back');

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}
