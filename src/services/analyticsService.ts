import mongoose from 'mongoose';
import Meeting from '../models/meeting';
import Participant from '../models/participant';
import SelectionRecord from '../models/SelectionRecord';
import Team from '../models/Team';

export class AnalyticsService {

    /**
     * Get dashboard statistics
     */
    static async getDashboardStats() {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Use aggregation to get all stats in parallel
            const [
                totalMeetings,
                activeParticipants,
                monthlySpins,
                averageSelectionTime,
                weeklyTrends
            ] = await Promise.all([
                Meeting.countDocuments({ isActive: true }),

                Participant.aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]),

                SelectionRecord.countDocuments({
                    selectedAt: { $gte: startOfMonth }
                }),

                SelectionRecord.aggregate([
                    { $match: { selectionDuration: { $exists: true, $ne: null } } },
                    { $group: { _id: null, avg: { $avg: '$selectionDuration' } } }
                ]),

                // Weekly trends
                this.getWeeklyTrends()
            ]);

            const activeParticipantsCount = activeParticipants[0]?.count || 0;
            const avgTime = averageSelectionTime[0]?.avg || 0;

            return {
                totalMeetings,
                activeParticipants: activeParticipantsCount,
                spinsThisMonth: monthlySpins,
                avgSelectionTime: `${Math.round(avgTime / 1000)}s`,
                trends: weeklyTrends
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Get weekly trends
     */
    static async getWeeklyTrends() {
        try {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const [thisWeek, lastWeek] = await Promise.all([
                this.getWeekStats(oneWeekAgo, now),
                this.getWeekStats(twoWeeksAgo, oneWeekAgo)
            ]);

            return {
                meetings: this.calculateTrend(thisWeek.meetings, lastWeek.meetings),
                participants: this.calculateTrend(thisWeek.participants, lastWeek.participants),
                spins: this.calculateTrend(thisWeek.spins, lastWeek.spins),
                responseTime: this.calculateTrend(
                    lastWeek.responseTime, // Inverted for response time (lower is better)
                    thisWeek.responseTime
                )
            };
        } catch (error) {
            console.error('Error getting weekly trends:', error);
            return {
                meetings: '+0%',
                participants: '+0%',
                spins: '+0%',
                responseTime: '+0%'
            };
        }
    }

    /**
     * Get stats for a specific week
     */
    private static async getWeekStats(startDate: Date, endDate: Date) {
        const [meetings, participants, spins, responseTime] = await Promise.all([
            Meeting.countDocuments({
                createdAt: { $gte: startDate, $lt: endDate }
            }),

            Participant.countDocuments({
                createdAt: { $gte: startDate, $lt: endDate }
            }),

            SelectionRecord.countDocuments({
                selectedAt: { $gte: startDate, $lt: endDate }
            }),

            SelectionRecord.aggregate([
                {
                    $match: {
                        selectedAt: { $gte: startDate, $lt: endDate },
                        selectionDuration: { $exists: true, $ne: null }
                    }
                },
                { $group: { _id: null, avg: { $avg: '$selectionDuration' } } }
            ])
        ]);

        return {
            meetings,
            participants,
            spins,
            responseTime: responseTime[0]?.avg || 0
        };
    }

    /**
     * Calculate percentage trend
     */
    private static calculateTrend(current: number, previous: number): string {
        if (previous === 0) return current > 0 ? '+100%' : '+0%';

        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${Math.round(change)}%`;
    }

    /**
     * Get recent meetings for dashboard
     */
    static async getRecentMeetings(limit: number = 5) {
        try {
            const meetings = await Meeting.find({ isActive: true })
                .populate('teamId', 'name')
                .sort({ 'statistics.lastActivity': -1, createdAt: -1 })
                .limit(limit)
                .lean();

            return meetings.map(meeting => ({
                id: meeting._id,
                name: meeting.name,
                department: meeting.department,
                lastSpin: meeting.statistics.lastActivity
                    ? meeting.statistics.lastActivity.toISOString()
                    : meeting.createdAt.toISOString(),
                participants: meeting.participants.length,
                status: meeting.status
            }));
        } catch (error) {
            console.error('Error getting recent meetings:', error);
            throw error;
        }
    }

    /**
     * Get top participants by selection count
     */
    static async getTopParticipants(limit: number = 10) {
        try {
            const participants = await Participant.aggregate([
                { $match: { isActive: true } },
                {
                    $lookup: {
                        from: 'selectionrecords',
                        localField: '_id',
                        foreignField: 'participantId',
                        as: 'selections'
                    }
                },
                {
                    $addFields: {
                        selectionCount: { $size: '$selections' },
                        lastActive: {
                            $max: '$selections.selectedAt'
                        }
                    }
                },
                { $sort: { selectionCount: -1 } },
                { $limit: limit },
                {
                    $project: {
                        name: 1,
                        department: 1,
                        selections: '$selectionCount',
                        meetings: '$totalMeetings',
                        lastActive: 1
                    }
                }
            ]);

            return participants.map(p => ({
                name: p.name,
                department: p.department,
                selections: p.selections,
                meetings: p.meetings || 1,
                lastActive: p.lastActive ? p.lastActive.toISOString() : 'Never'
            }));
        } catch (error) {
            console.error('Error getting top participants:', error);
            throw error;
        }
    }

    /**
     * Get analytics overview
     */
    static async getAnalyticsOverview() {
        try {
            const [
                totalSelections,
                activeParticipants,
                meetingsHeld,
                avgResponseTime
            ] = await Promise.all([
                SelectionRecord.countDocuments(),
                Participant.countDocuments({ isActive: true }),
                Meeting.countDocuments(),
                SelectionRecord.aggregate([
                    { $match: { selectionDuration: { $exists: true, $ne: null } } },
                    { $group: { _id: null, avg: { $avg: '$selectionDuration' } } }
                ])
            ]);

            const trends = await this.getWeeklyTrends();

            return {
                totalSelections,
                activeParticipants,
                meetingsHeld,
                avgResponseTime: `${Math.round((avgResponseTime[0]?.avg || 0) / 1000)}s`,
                trends
            };
        } catch (error) {
            console.error('Error getting analytics overview:', error);
            throw error;
        }
    }

    /**
     * Get weekly activity data
     */
    static async getWeeklyActivity() {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const activity = await SelectionRecord.aggregate([
                { $match: { selectedAt: { $gte: oneWeekAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$selectedAt" } },
                        selections: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Fill in missing days with 0 selections
            const result = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const existingData = activity.find(a => a._id === dateStr);
                result.push({
                    date: dateStr,
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    selections: existingData ? existingData.selections : 0
                });
            }

            return result;
        } catch (error) {
            console.error('Error getting weekly activity:', error);
            throw error;
        }
    }

    /**
     * Get department performance
     */
    static async getDepartmentPerformance() {
        try {
            const departments = await SelectionRecord.aggregate([
                {
                    $group: {
                        _id: "$department",
                        selections: { $sum: 1 },
                        participants: { $addToSet: "$participantId" },
                        avgResponseTime: { $avg: "$selectionDuration" }
                    }
                },
                {
                    $lookup: {
                        from: 'meetings',
                        let: { dept: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$department', '$$dept'] } } }
                        ],
                        as: 'meetings'
                    }
                },
                {
                    $project: {
                        name: "$_id",
                        selections: 1,
                        participants: { $size: "$participants" },
                        meetings: { $size: "$meetings" },
                        averageResponseTime: { $round: [{ $divide: ["$avgResponseTime", 1000] }, 1] },
                        growth: "+5%" // This would be calculated based on historical data
                    }
                },
                { $sort: { selections: -1 } }
            ]);

            return departments;
        } catch (error) {
            console.error('Error getting department performance:', error);
            throw error;
        }
    }

    /**
     * Get selection fairness analysis
     */
    static async getSelectionFairness(meetingId?: string) {
        try {
            const matchFilter: any = {};
            if (meetingId) {
                matchFilter.meetingId = new mongoose.Types.ObjectId(meetingId);
            }

            const result = await SelectionRecord.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: "$participantId",
                        selectionCount: { $sum: 1 },
                        participantName: { $first: "$participantName" }
                    }
                },
                {
                    $facet: {
                        distribution: [
                            {
                                $project: {
                                    participantId: "$_id",
                                    participantName: 1,
                                    selectionCount: 1
                                }
                            }
                        ],
                        stats: [
                            {
                                $group: {
                                    _id: null,
                                    totalParticipants: { $sum: 1 },
                                    participantsSelected: {
                                        $sum: { $cond: [{ $gt: ["$selectionCount", 0] }, 1, 0] }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);

            const stats = result[0]?.stats[0];
            if (!stats) {
                return {
                    fairnessScore: 0,
                    participantsSelectedAtLeastOnce: 0,
                    totalParticipants: 0,
                    selectionDistribution: []
                };
            }

            const fairnessScore = (stats.participantsSelected / stats.totalParticipants) * 100;

            return {
                fairnessScore: Math.round(fairnessScore),
                participantsSelectedAtLeastOnce: stats.participantsSelected,
                totalParticipants: stats.totalParticipants,
                selectionDistribution: result[0].distribution
            };
        } catch (error) {
            console.error('Error getting selection fairness:', error);
            throw error;
        }
    }

    /**
     * Get peak hours analysis
     */
    static async getPeakHours() {
        try {
            const hourlyActivity = await SelectionRecord.aggregate([
                {
                    $project: {
                        hour: { $hour: "$selectedAt" },
                        selections: 1
                    }
                },
                {
                    $group: {
                        _id: "$hour",
                        selections: { $sum: 1 }
                    }
                },
                { $sort: { selections: -1 } }
            ]);

            if (hourlyActivity.length === 0) {
                return {
                    peakHour: "No data",
                    activityPercentage: 0,
                    hourlyDistribution: []
                };
            }

            const totalSelections = hourlyActivity.reduce((sum, h) => sum + h.selections, 0);
            const peakHourData = hourlyActivity[0];
            const activityPercentage = (peakHourData.selections / totalSelections) * 100;

            // Format hour
            const peakHour = `${peakHourData._id}:00-${peakHourData._id + 1}:00`;

            return {
                peakHour,
                activityPercentage: Math.round(activityPercentage),
                hourlyDistribution: hourlyActivity.map(h => ({
                    hour: h._id,
                    selections: h.selections
                }))
            };
        } catch (error) {
            console.error('Error getting peak hours:', error);
            throw error;
        }
    }

    /**
     * Get engagement score
     */
    static async getEngagementScore() {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [
                totalParticipants,
                activeParticipants,
                repeatUsers,
                avgSessionData
            ] = await Promise.all([
                Participant.countDocuments(),

                Participant.countDocuments({
                    lastSelected: { $gte: thirtyDaysAgo }
                }),

                SelectionRecord.aggregate([
                    { $match: { selectedAt: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: "$participantId",
                            selectionCount: { $sum: 1 }
                        }
                    },
                    { $match: { selectionCount: { $gt: 1 } } },
                    { $count: "repeatUsers" }
                ]),

                SelectionRecord.aggregate([
                    { $match: { selectionDuration: { $exists: true, $ne: null } } },
                    {
                        $group: {
                            _id: null,
                            avgDuration: { $avg: "$selectionDuration" }
                        }
                    }
                ])
            ]);

            const participationRate = totalParticipants > 0
                ? (activeParticipants / totalParticipants) * 100
                : 0;

            const repeatUsageRate = activeParticipants > 0
                ? ((repeatUsers[0]?.repeatUsers || 0) / activeParticipants) * 100
                : 0;

            const averageSessionDuration = (avgSessionData[0]?.avgDuration || 0) / 1000; // Convert to seconds

            // Calculate overall score (0-10)
            const overallScore = Math.min(10, (
                (participationRate / 100) * 4 +
                (repeatUsageRate / 100) * 3 +
                Math.min(1, averageSessionDuration / 60) * 3 // Normalize session duration
            ));

            return {
                overallScore: Math.round(overallScore * 10) / 10,
                participationRate: Math.round(participationRate),
                averageSessionDuration: Math.round(averageSessionDuration),
                repeatUsageRate: Math.round(repeatUsageRate)
            };
        } catch (error) {
            console.error('Error getting engagement score:', error);
            throw error;
        }
    }
}

export default AnalyticsService;
