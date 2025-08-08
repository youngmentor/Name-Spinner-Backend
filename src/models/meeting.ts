import mongoose, { Schema, Document, Types } from 'mongoose';
import { IParticipant } from './participant';

export interface IMeeting extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    department: string;
    description?: string;
    isActive: boolean;
    participants: IParticipant[];
    // Enhanced enterprise fields
    teamId?: mongoose.Types.ObjectId;
    status: 'active' | 'scheduled' | 'completed' | 'archived';
    settings: {
        spinDuration: number;
        excludeRecentlySelected: boolean;
        allowManualSelection: boolean;
        maxSelectionsPerSession?: number;
        selectionMethod: 'random' | 'weighted' | 'manual';
    };
    statistics: {
        totalSpins: number;
        totalParticipants: number;
        lastActivity?: Date;
        averageSpinDuration?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const MeetingSchema: Schema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    department: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    participants: [{
        name: { type: String, required: true },
        role: { type: String },
        email: { type: String },
        department: { type: String, required: false },
        lastSelected: { type: Date },
        selectionCount: { type: Number, default: 0 }
    }],
    // Enhanced enterprise fields
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'scheduled', 'completed', 'archived'],
        default: 'active',
        index: true
    },
    settings: {
        spinDuration: {
            type: Number,
            default: 3000,
            min: 1000,
            max: 10000
        },
        excludeRecentlySelected: {
            type: Boolean,
            default: true
        },
        allowManualSelection: {
            type: Boolean,
            default: false
        },
        maxSelectionsPerSession: {
            type: Number,
            min: 1,
            max: 100
        },
        selectionMethod: {
            type: String,
            enum: ['random', 'weighted', 'manual'],
            default: 'random'
        }
    },
    statistics: {
        totalSpins: {
            type: Number,
            default: 0,
            min: 0
        },
        totalParticipants: {
            type: Number,
            default: 0,
            min: 0
        },
        lastActivity: { type: Date },
        averageSpinDuration: {
            type: Number,
            min: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for multi-tenancy and performance
MeetingSchema.index({ organizationId: 1, teamId: 1 });
MeetingSchema.index({ organizationId: 1, status: 1 });
MeetingSchema.index({ organizationId: 1, department: 1 });
MeetingSchema.index({ organizationId: 1, createdAt: -1 });

// Virtual for participant count
MeetingSchema.virtual('participantCount').get(function (this: IMeeting) {
    return this.participants.length;
});

// Virtual for team reference
MeetingSchema.virtual('team', {
    ref: 'Team',
    localField: 'teamId',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);