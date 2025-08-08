import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyStats extends Document {
    organizationId: mongoose.Types.ObjectId;
    date: Date;
    totalSelections: number;
    uniqueParticipants: number;
    uniqueMeetings: number;
    averageResponseTime: number;
    departmentBreakdown: Array<{
        department: string;
        selections: number;
        participants: number;
    }>;
    peakHours: Array<{
        hour: number;
        selections: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const DailyStatsSchema: Schema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    totalSelections: {
        type: Number,
        default: 0,
        min: 0
    },
    uniqueParticipants: {
        type: Number,
        default: 0,
        min: 0
    },
    uniqueMeetings: {
        type: Number,
        default: 0,
        min: 0
    },
    averageResponseTime: {
        type: Number,
        default: 0,
        min: 0
    },
    departmentBreakdown: [{
        department: {
            type: String,
            required: true,
            trim: true
        },
        selections: {
            type: Number,
            default: 0,
            min: 0
        },
        participants: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    peakHours: [{
        hour: {
            type: Number,
            required: true,
            min: 0,
            max: 23
        },
        selections: {
            type: Number,
            default: 0,
            min: 0
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Compound indexes for multi-tenancy and performance
DailyStatsSchema.index({ organizationId: 1, date: 1 }, { unique: true }); // Unique date per organization
DailyStatsSchema.index({ organizationId: 1, date: -1 });

export default mongoose.model<IDailyStats>('DailyStats', DailyStatsSchema);
