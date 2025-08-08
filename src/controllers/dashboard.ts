import { RequestHandler } from 'express';
import { AnalyticsService } from '../services/analyticsService';

/**
 * Get dashboard statistics
 */
export const getDashboardStats: RequestHandler = async (req, res) => {
    try {
        const stats = await AnalyticsService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            error: 'Error fetching dashboard statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get recent meetings for dashboard
 */
export const getRecentMeetings: RequestHandler = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
        const meetings = await AnalyticsService.getRecentMeetings(limit);

        res.json({
            meetings
        });
    } catch (error) {
        console.error('Error getting recent meetings:', error);
        res.status(500).json({
            error: 'Error fetching recent meetings',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get top participants by selection count
 */
export const getTopParticipants: RequestHandler = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const participants = await AnalyticsService.getTopParticipants(limit);

        res.json({
            participants
        });
    } catch (error) {
        console.error('Error getting top participants:', error);
        res.status(500).json({
            error: 'Error fetching top participants',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
