import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    color: string;
    leadId?: mongoose.Types.ObjectId;
    members: Array<{
        participantId: mongoose.Types.ObjectId;
        role: string;
        joinedAt: Date;
    }>;
    settings: Map<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
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
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    color: {
        type: String,
        default: 'blue',
        enum: ['blue', 'green', 'red', 'purple', 'orange', 'teal', 'pink', 'indigo']
    },
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    members: [{
        participantId: {
            type: Schema.Types.ObjectId,
            ref: 'Participant',
            required: true
        },
        role: {
            type: String,
            default: 'member',
            enum: ['lead', 'member', 'admin']
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        type: Map,
        of: Schema.Types.Mixed,
        default: new Map()
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for member count
TeamSchema.virtual('memberCount').get(function (this: ITeam) {
    return this.members.length;
});

// Indexes for multi-tenancy and performance
TeamSchema.index({ organizationId: 1, name: 1 }, { unique: true }); // Unique team names per organization
TeamSchema.index({ organizationId: 1, leadId: 1 });
TeamSchema.index({ organizationId: 1, 'members.participantId': 1 });

export default mongoose.model<ITeam>('Team', TeamSchema);
