// models/Participant.ts
import { strict } from 'assert';
import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    role?: string;
    email?: string;
    department: string;
    lastSelected?: Date;
    selectionCount: number;
    // Enhanced enterprise fields
    meetingId?: mongoose.Types.ObjectId;
    teamId?: mongoose.Types.ObjectId;
    isActive: boolean;
    avatar?: string;
    totalMeetings: number;
    metadata?: Map<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const ParticipantSchema: Schema = new Schema({
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
        maxlength: 100
    },
    role: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        index: true
    },
    department: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    lastSelected: {
        type: Date,
        index: true
    },
    selectionCount: {
        type: Number,
        default: 0,
        min: 0,
        index: true
    },
    // Enhanced enterprise fields
    meetingId: {
        type: Schema.Types.ObjectId,
        ref: 'Meeting',
        index: true
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    avatar: {
        type: String,
        trim: true
    },
    totalMeetings: {
        type: Number,
        default: 1,
        min: 0
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: new Map()
    }
},
    {
        timestamps: true,
        strict: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Compound indexes for multi-tenancy and performance
ParticipantSchema.index({ organizationId: 1, meetingId: 1, department: 1 });
ParticipantSchema.index({ organizationId: 1, teamId: 1 });
ParticipantSchema.index({ organizationId: 1, email: 1 });
ParticipantSchema.index({ organizationId: 1, isActive: 1 });
ParticipantSchema.index({ organizationId: 1, selectionCount: -1 });

// Virtual for meeting reference
ParticipantSchema.virtual('meeting', {
    ref: 'Meeting',
    localField: 'meetingId',
    foreignField: '_id',
    justOne: true
});

// Virtual for team reference
ParticipantSchema.virtual('team', {
    ref: 'Team',
    localField: 'teamId',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model<IParticipant>('Participant', ParticipantSchema);
