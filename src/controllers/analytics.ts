import { RequestHandler } from 'express';
import { AnalyticsService } from '../services/analyticsService';

/**
 * Get analytics overview
 */
export const getAnalyticsOverview: RequestHandler = async (req, res) => {
    try {
        const overview = await AnalyticsService.getAnalyticsOverview();
        res.json(overview);
    } catch (error) {
        console.error('Error getting analytics overview:', error);
        res.status(500).json({
            error: 'Error fetching analytics overview',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get weekly activity data
 */
export const getWeeklyActivity: RequestHandler = async (req, res) => {
    try {
        const data = await AnalyticsService.getWeeklyActivity();
        res.json({ data });
    } catch (error) {
        console.error('Error getting weekly activity:', error);
        res.status(500).json({
            error: 'Error fetching weekly activity data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get department performance
 */
export const getDepartmentPerformance: RequestHandler = async (req, res) => {
    try {
        const departments = await AnalyticsService.getDepartmentPerformance();
        res.json({ departments });
    } catch (error) {
        console.error('Error getting department performance:', error);
        res.status(500).json({
            error: 'Error fetching department performance data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get selection fairness analysis
 */
export const getSelectionFairness: RequestHandler = async (req, res) => {
    try {
        const meetingId = req.query.meetingId as string;
        const fairness = await AnalyticsService.getSelectionFairness(meetingId);
        res.json(fairness);
    } catch (error) {
        console.error('Error getting selection fairness:', error);
        res.status(500).json({
            error: 'Error fetching selection fairness data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get peak hours analysis
 */
export const getPeakHours: RequestHandler = async (req, res) => {
    try {
        const peakHours = await AnalyticsService.getPeakHours();
        res.json(peakHours);
    } catch (error) {
        console.error('Error getting peak hours:', error);
        res.status(500).json({
            error: 'Error fetching peak hours data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get engagement score
 */
export const getEngagementScore: RequestHandler = async (req, res) => {
    try {
        const engagement = await AnalyticsService.getEngagementScore();
        res.json(engagement);
    } catch (error) {
        console.error('Error getting engagement score:', error);
        res.status(500).json({
            error: 'Error fetching engagement score',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
