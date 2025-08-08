import mongoose, { Schema, Document } from 'mongoose';

export interface ISelectionRecord extends Document {
    organizationId: mongoose.Types.ObjectId;
    meetingId: mongoose.Types.ObjectId;
    participantId: mongoose.Types.ObjectId;
    participantName: string;
    department: string;
    teamId?: mongoose.Types.ObjectId;
    selectionDuration?: number; // milliseconds
    sessionId?: string; // Group related selections
    selectionMethod: 'random' | 'weighted' | 'manual';
    metadata?: {
        excludedRecentlySelected?: boolean;
        totalEligible?: number;
        spinDuration?: number;
        selectionRound?: number;
        migrated?: boolean;
    };
    selectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SelectionRecordSchema: Schema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    meetingId: {
        type: Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true,
        index: true
    },
    participantId: {
        type: Schema.Types.ObjectId,
        ref: 'Participant',
        required: true,
        index: true
    },
    participantName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    department: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        index: true
    },
    selectionDuration: {
        type: Number, // milliseconds
        min: 0,
        max: 60000 // Max 1 minute
    },
    sessionId: {
        type: String,
        trim: true,
        index: true
    },
    selectionMethod: {
        type: String,
        enum: ['random', 'weighted', 'manual'],
        default: 'random'
    },
    metadata: {
        excludedRecentlySelected: { type: Boolean, default: false },
        totalEligible: { type: Number, min: 0 },
        spinDuration: { type: Number, min: 0 },
        selectionRound: { type: Number, min: 1 },
        migrated: { type: Boolean, default: false }
    },
    selectedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for multi-tenancy and performance
SelectionRecordSchema.index({ organizationId: 1, meetingId: 1, selectedAt: -1 });
SelectionRecordSchema.index({ organizationId: 1, participantId: 1, selectedAt: -1 });
SelectionRecordSchema.index({ organizationId: 1, department: 1, selectedAt: -1 });
SelectionRecordSchema.index({ organizationId: 1, teamId: 1, selectedAt: -1 });
SelectionRecordSchema.index({ organizationId: 1, selectedAt: -1 });
SelectionRecordSchema.index({ organizationId: 1, sessionId: 1 });

// Virtual for meeting reference
SelectionRecordSchema.virtual('meeting', {
    ref: 'Meeting',
    localField: 'meetingId',
    foreignField: '_id',
    justOne: true
});

// Virtual for participant reference
SelectionRecordSchema.virtual('participant', {
    ref: 'Participant',
    localField: 'participantId',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model<ISelectionRecord>('SelectionRecord', SelectionRecordSchema);
