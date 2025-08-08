import { Router } from 'express';
import {
    getAnalyticsOverview,
    getWeeklyActivity,
    getDepartmentPerformance,
    getSelectionFairness,
    getPeakHours,
    getEngagementScore
} from '../controllers/analytics';

const router = Router();

/**
 * @route GET /api/analytics/overview
 * @desc Get analytics overview
 * @access Public
 */
router.get('/overview', getAnalyticsOverview);

/**
 * @route GET /api/analytics/weekly-activity
 * @desc Get weekly activity data
 * @access Public
 */
router.get('/weekly-activity', getWeeklyActivity);

/**
 * @route GET /api/analytics/department-performance
 * @desc Get department performance data
 * @access Public
 */
router.get('/department-performance', getDepartmentPerformance);

/**
 * @route GET /api/analytics/selection-fairness
 * @desc Get selection fairness analysis
 * @access Public
 */
router.get('/selection-fairness', getSelectionFairness);

/**
 * @route GET /api/analytics/peak-hours
 * @desc Get peak hours analysis
 * @access Public
 */
router.get('/peak-hours', getPeakHours);

/**
 * @route GET /api/analytics/engagement-score
 * @desc Get engagement score metrics
 * @access Public
 */
router.get('/engagement-score', getEngagementScore);

export default router;
