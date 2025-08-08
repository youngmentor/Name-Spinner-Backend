import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import Meeting from '../models/meeting';
import Participant from '../models/participant';
import SelectionRecord from '../models/SelectionRecord';
import Team from '../models/Team';
import ExportJob from '../models/ExportJob';
import { AnalyticsService } from './analyticsService';

export class ExportService {
    private static EXPORT_DIR = path.join(process.cwd(), 'exports');
    private static EXPORT_EXPIRY_HOURS = 24;

    /**
     * Initialize export directory
     */
    static initializeExportDirectory() {
        if (!fs.existsSync(this.EXPORT_DIR)) {
            fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
        }
    }

    /**
     * Create export job
     */
    static async createExportJob(
        type: 'meeting' | 'analytics' | 'participants' | 'teams',
        format: 'json' | 'csv' | 'excel',
        filters: any = {},
        userId?: string
    ) {
        try {
            this.initializeExportDirectory();

            const exportJob = new ExportJob({
                userId,
                type,
                format,
                filters,
                status: 'pending',
                expiresAt: new Date(Date.now() + this.EXPORT_EXPIRY_HOURS * 60 * 60 * 1000)
            });

            await exportJob.save();

            // Process export in background
            this.processExportJob((exportJob._id as any).toString());

            return exportJob;
        } catch (error) {
            console.error('Error creating export job:', error);
            throw error;
        }
    }

    /**
     * Process export job
     */
    static async processExportJob(jobId: string) {
        try {
            const job = await ExportJob.findById(jobId);
            if (!job) {
                throw new Error('Export job not found');
            }

            // Update status to processing
            job.status = 'processing';
            await job.save();

            let data: any;

            // Get data based on type
            switch (job.type) {
                case 'meeting':
                    data = await this.getMeetingExportData(job.filters);
                    break;
                case 'analytics':
                    data = await this.getAnalyticsExportData(job.filters);
                    break;
                case 'participants':
                    data = await this.getParticipantsExportData(job.filters);
                    break;
                case 'teams':
                    data = await this.getTeamsExportData(job.filters);
                    break;
                default:
                    throw new Error('Invalid export type');
            }

            // Generate file
            const fileName = `${job.type}-export-${uuidv4()}.${job.format}`;
            const filePath = path.join(this.EXPORT_DIR, fileName);

            await this.generateFile(data, job.format, filePath);

            // Update job with download URL
            job.status = 'completed';
            job.downloadUrl = `/api/export/download/${fileName}`;
            await job.save();

        } catch (error) {
            console.error('Error processing export job:', error);

            // Update job with error
            const job = await ExportJob.findById(jobId);
            if (job) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : 'Unknown error';
                await job.save();
            }
        }
    }

    /**
     * Get meeting export data
     */
    private static async getMeetingExportData(filters: any) {
        const matchFilter: any = {};

        if (filters.meetingId) {
            matchFilter._id = filters.meetingId;
        }
        if (filters.department) {
            matchFilter.department = filters.department;
        }
        if (filters.dateRange) {
            matchFilter.createdAt = {
                $gte: new Date(filters.dateRange.start),
                $lte: new Date(filters.dateRange.end)
            };
        }

        const meetings = await Meeting.find(matchFilter)
            .populate('teamId', 'name')
            .lean();

        const exportData = [];

        for (const meeting of meetings) {
            // Get participants for this meeting
            const participants = await Participant.find({ meetingId: meeting._id }).lean();

            // Get selection history if requested
            let selectionHistory: string | any[] = [];
            if (filters.includeHistory) {
                selectionHistory = await SelectionRecord.find({ meetingId: meeting._id })
                    .sort({ selectedAt: -1 })
                    .lean();
            }

            exportData.push({
                id: meeting._id,
                name: meeting.name,
                department: meeting.department,
                description: meeting.description,
                status: meeting.status,
                team: meeting.teamId ? (meeting.teamId as any).name : null,
                participantCount: participants.length,
                totalSelections: selectionHistory.length,
                settings: meeting.settings,
                statistics: meeting.statistics,
                createdAt: meeting.createdAt,
                updatedAt: meeting.updatedAt,
                ...(filters.includeHistory && {
                    participants,
                    selectionHistory
                })
            });
        }

        return exportData;
    }

    /**
     * Get analytics export data
     */
    private static async getAnalyticsExportData(filters: any) {
        const [
            overview,
            weeklyActivity,
            departmentPerformance,
            selectionFairness,
            peakHours,
            engagement
        ] = await Promise.all([
            AnalyticsService.getAnalyticsOverview(),
            AnalyticsService.getWeeklyActivity(),
            AnalyticsService.getDepartmentPerformance(),
            AnalyticsService.getSelectionFairness(),
            AnalyticsService.getPeakHours(),
            AnalyticsService.getEngagementScore()
        ]);

        return {
            overview,
            weeklyActivity,
            departmentPerformance,
            selectionFairness,
            peakHours,
            engagement,
            exportedAt: new Date(),
            filters
        };
    }

    /**
     * Get participants export data
     */
    private static async getParticipantsExportData(filters: any) {
        const matchFilter: any = {};

        if (filters.department) {
            matchFilter.department = filters.department;
        }
        if (filters.teamId) {
            matchFilter.teamId = filters.teamId;
        }
        if (filters.dateRange) {
            matchFilter.createdAt = {
                $gte: new Date(filters.dateRange.start),
                $lte: new Date(filters.dateRange.end)
            };
        }

        const participants = await Participant.find(matchFilter)
            .populate('teamId', 'name')
            .populate('meetingId', 'name department')
            .lean();

        // Get selection counts for each participant
        const participantData = await Promise.all(
            participants.map(async (participant) => {
                const selectionCount = await SelectionRecord.countDocuments({
                    participantId: participant._id
                });

                const recentSelections = await SelectionRecord.find({
                    participantId: participant._id
                })
                    .sort({ selectedAt: -1 })
                    .limit(5)
                    .lean();

                return {
                    id: participant._id,
                    name: participant.name,
                    email: participant.email,
                    role: participant.role,
                    department: participant.department,
                    team: participant.teamId ? (participant.teamId as any).name : null,
                    meeting: participant.meetingId ? (participant.meetingId as any).name : null,
                    selectionCount,
                    totalMeetings: participant.totalMeetings,
                    lastSelected: participant.lastSelected,
                    isActive: participant.isActive,
                    recentSelections,
                    createdAt: participant.createdAt,
                    updatedAt: participant.updatedAt
                };
            })
        );

        return participantData;
    }

    /**
     * Get teams export data
     */
    private static async getTeamsExportData(filters: any) {
        const teams = await Team.find()
            .populate('leadId', 'name email')
            .populate('members.participantId', 'name email department')
            .lean();

        const teamsData = await Promise.all(
            teams.map(async (team) => {
                // Get team statistics
                const teamMeetings = await Meeting.countDocuments({ teamId: team._id });
                const teamSelections = await SelectionRecord.countDocuments({ teamId: team._id });

                return {
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    color: team.color,
                    lead: team.leadId ? {
                        name: (team.leadId as any).name,
                        email: (team.leadId as any).email
                    } : null,
                    memberCount: team.members.length,
                    members: team.members.map(member => ({
                        name: (member.participantId as any).name,
                        email: (member.participantId as any).email,
                        department: (member.participantId as any).department,
                        role: member.role,
                        joinedAt: member.joinedAt
                    })),
                    totalMeetings: teamMeetings,
                    totalSelections: teamSelections,
                    createdAt: team.createdAt,
                    updatedAt: team.updatedAt
                };
            })
        );

        return teamsData;
    }

    /**
     * Generate file in specified format
     */
    private static async generateFile(data: any, format: string, filePath: string) {
        switch (format) {
            case 'json':
                await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
                break;

            case 'csv':
                await this.generateCSV(data, filePath);
                break;

            case 'excel':
                await this.generateExcel(data, filePath);
                break;

            default:
                throw new Error('Unsupported format');
        }
    }

    /**
     * Generate CSV file
     */
    private static async generateCSV(data: any, filePath: string) {
        // Flatten data for CSV format
        const flatData = Array.isArray(data) ? data : [data];

        if (flatData.length === 0) {
            await fs.promises.writeFile(filePath, 'No data available');
            return;
        }

        // Get headers from first object
        const headers = this.getCSVHeaders(flatData[0]);

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: headers
        });

        const records = flatData.map(item => this.flattenObject(item));
        await csvWriter.writeRecords(records);
    }

    /**
     * Generate Excel file
     */
    private static async generateExcel(data: any, filePath: string) {
        const workbook = XLSX.utils.book_new();

        if (Array.isArray(data)) {
            // Create worksheet from array
            const worksheet = XLSX.utils.json_to_sheet(data.map(item => this.flattenObject(item)));
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        } else {
            // Create multiple worksheets for complex data
            for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    const worksheet = XLSX.utils.json_to_sheet(
                        value.map(item => this.flattenObject(item))
                    );
                    XLSX.utils.book_append_sheet(workbook, worksheet, key);
                } else {
                    const worksheet = XLSX.utils.json_to_sheet([this.flattenObject(value)]);
                    XLSX.utils.book_append_sheet(workbook, worksheet, key);
                }
            }
        }

        XLSX.writeFile(workbook, filePath);
    }

    /**
     * Get CSV headers from object
     */
    private static getCSVHeaders(obj: any): Array<{ id: string, title: string }> {
        const flattened = this.flattenObject(obj);
        return Object.keys(flattened).map(key => ({ id: key, title: key }));
    }

    /**
     * Flatten object for CSV/Excel export
     */
    private static flattenObject(obj: any, prefix: string = ''): any {
        const flattened: any = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (obj[key] === null || obj[key] === undefined) {
                    flattened[newKey] = '';
                } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
                    Object.assign(flattened, this.flattenObject(obj[key], newKey));
                } else if (Array.isArray(obj[key])) {
                    flattened[newKey] = JSON.stringify(obj[key]);
                } else {
                    flattened[newKey] = obj[key];
                }
            }
        }

        return flattened;
    }

    /**
     * Get export job status
     */
    static async getExportJobStatus(jobId: string) {
        const job = await ExportJob.findById(jobId);
        if (!job) {
            throw new Error('Export job not found');
        }

        return {
            id: job._id,
            type: job.type,
            format: job.format,
            status: job.status,
            downloadUrl: job.downloadUrl,
            error: job.error,
            createdAt: job.createdAt,
            expiresAt: job.expiresAt
        };
    }

    /**
     * Get file for download
     */
    static getDownloadFilePath(fileName: string): string {
        const filePath = path.join(this.EXPORT_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            throw new Error('File not found or expired');
        }

        return filePath;
    }

    /**
     * Clean up expired exports
     */
    static async cleanupExpiredExports() {
        try {
            // Delete expired jobs from database
            await ExportJob.deleteMany({
                expiresAt: { $lt: new Date() }
            });

            // Clean up files older than expiry time
            const files = await fs.promises.readdir(this.EXPORT_DIR);
            const now = Date.now();
            const expiryTime = this.EXPORT_EXPIRY_HOURS * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(this.EXPORT_DIR, file);
                const stats = await fs.promises.stat(filePath);

                if (now - stats.mtime.getTime() > expiryTime) {
                    await fs.promises.unlink(filePath);
                }
            }

            console.log('Cleaned up expired exports');
        } catch (error) {
            console.error('Error cleaning up expired exports:', error);
        }
    }
}

export default ExportService;
