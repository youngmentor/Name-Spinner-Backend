import { Router } from 'express';
import {
    createExportJob,
    getExportJobStatus,
    downloadExportFile
} from '../controllers/export';

const router = Router();

/**
 * @route POST /api/export/meeting/:id
 * @desc Create meeting export job
 * @access Public
 */
router.post('/meeting/:id', createExportJob);

/**
 * @route POST /api/export/analytics
 * @desc Create analytics export job
 * @access Public
 */
router.post('/analytics', createExportJob);

/**
 * @route POST /api/export/participants
 * @desc Create participants export job
 * @access Public
 */
router.post('/participants', createExportJob);

/**
 * @route POST /api/export/teams
 * @desc Create teams export job
 * @access Public
 */
router.post('/teams', createExportJob);

/**
 * @route GET /api/export/status/:exportId
 * @desc Get export job status
 * @access Public
 */
router.get('/status/:exportId', getExportJobStatus);

/**
 * @route GET /api/export/download/:fileName
 * @desc Download export file
 * @access Public
 */
router.get('/download/:fileName', downloadExportFile);

export default router;
