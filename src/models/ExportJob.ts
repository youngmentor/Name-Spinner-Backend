import mongoose, { Schema, Document } from 'mongoose';

export interface IExportJob extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    type: 'meeting' | 'analytics' | 'participants' | 'teams';
    format: 'json' | 'csv' | 'excel';
    filters: {
        meetingId?: mongoose.Types.ObjectId;
        dateRange?: {
            start: Date;
            end: Date;
        };
        department?: string;
        teamId?: mongoose.Types.ObjectId;
    };
    status: 'pending' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    expiresAt?: Date;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExportJobSchema: Schema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    type: {
        type: String,
        enum: ['meeting', 'analytics', 'participants', 'teams'],
        required: true,
        index: true
    },
    format: {
        type: String,
        enum: ['json', 'csv', 'excel'],
        required: true
    },
    filters: {
        meetingId: {
            type: Schema.Types.ObjectId,
            ref: 'Meeting'
        },
        dateRange: {
            start: { type: Date },
            end: { type: Date }
        },
        department: {
            type: String,
            trim: true
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    downloadUrl: {
        type: String,
        trim: true
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
    },
    error: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Compound indexes for multi-tenancy and performance
ExportJobSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
ExportJobSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<IExportJob>('ExportJob', ExportJobSchema);
