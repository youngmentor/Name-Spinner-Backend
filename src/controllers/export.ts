import { RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import { ExportService } from '../services/exportService';

/**
 * Create export job
 */
export const createExportJob: RequestHandler = async (req, res) => {
    try {
        const { format, includeHistory, dateRange } = req.body;

        if (!format || !['json', 'csv', 'excel'].includes(format)) {
            res.status(400).json({ error: 'Valid format (json, csv, excel) is required' });
            return;
        }

        // Determine export type from route
        let exportType: 'meeting' | 'analytics' | 'participants' | 'teams';
        const routePath = req.route.path;

        if (routePath.includes('/meeting/')) {
            exportType = 'meeting';
        } else if (routePath.includes('/analytics')) {
            exportType = 'analytics';
        } else if (routePath.includes('/participants')) {
            exportType = 'participants';
        } else if (routePath.includes('/teams')) {
            exportType = 'teams';
        } else {
            res.status(400).json({ error: 'Invalid export type' });
            return;
        }

        // Build filters
        const filters: any = {};

        if (exportType === 'meeting' && req.params.id) {
            filters.meetingId = req.params.id;
        }

        if (includeHistory !== undefined) {
            filters.includeHistory = includeHistory;
        }

        if (dateRange) {
            filters.dateRange = dateRange;
        }

        if (req.body.department) {
            filters.department = req.body.department;
        }

        if (req.body.teamId) {
            filters.teamId = req.body.teamId;
        }

        // Create export job
        const job = await ExportService.createExportJob(
            exportType,
            format,
            filters
        );

        res.json({
            jobId: job._id,
            status: job.status,
            type: job.type,
            format: job.format,
            createdAt: job.createdAt,
            expiresAt: job.expiresAt
        });
    } catch (error) {
        console.error('Error creating export job:', error);
        res.status(500).json({
            error: 'Error creating export job',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get export job status
 */
export const getExportJobStatus: RequestHandler = async (req, res) => {
    try {
        const status = await ExportService.getExportJobStatus(req.params.exportId);
        res.json(status);
    } catch (error) {
        console.error('Error getting export job status:', error);

        if (error instanceof Error && error.message === 'Export job not found') {
            res.status(404).json({ error: 'Export job not found' });
            return;
        }

        res.status(500).json({
            error: 'Error fetching export job status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Download export file
 */
export const downloadExportFile: RequestHandler = async (req, res) => {
    try {
        const fileName = req.params.fileName;

        // Validate file name to prevent directory traversal
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            res.status(400).json({ error: 'Invalid file name' });
            return;
        }

        const filePath = ExportService.getDownloadFilePath(fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found or expired' });
            return;
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        // Set appropriate headers
        const fileExtension = path.extname(fileName).toLowerCase();
        let contentType = 'application/octet-stream';

        switch (fileExtension) {
            case '.json':
                contentType = 'application/json';
                break;
            case '.csv':
                contentType = 'text/csv';
                break;
            case '.xlsx':
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error downloading file' });
            }
        });

    } catch (error) {
        console.error('Error downloading export file:', error);

        if (error instanceof Error && error.message === 'File not found or expired') {
            res.status(404).json({ error: 'File not found or expired' });
            return;
        }

        res.status(500).json({
            error: 'Error downloading file',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
