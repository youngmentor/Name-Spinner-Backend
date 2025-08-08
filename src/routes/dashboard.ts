import { Router } from 'express';
import {
    getDashboardStats,
    getRecentMeetings,
    getTopParticipants
} from '../controllers/dashboard';

const router = Router();

/**
 * @route GET /api/dashboard/stats
 * @desc Get dashboard statistics
 * @access Public
 */
router.get('/stats', getDashboardStats);

/**
 * @route GET /api/dashboard/recent-meetings
 * @desc Get recent meetings for dashboard
 * @access Public
 */
router.get('/recent-meetings', getRecentMeetings);

/**
 * @route GET /api/dashboard/top-participants
 * @desc Get top participants by selection count
 * @access Public
 */
router.get('/top-participants', getTopParticipants);

export default router;
