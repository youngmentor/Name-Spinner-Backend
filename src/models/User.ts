import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    email: string;
    department?: string;
    role?: string;
    organizationRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    avatarUrl?: string;
    isActive: boolean;
    lastLogin?: Date;
    permissions: {
        canCreateMeetings: boolean;
        canManageTeams: boolean;
        canViewAnalytics: boolean;
        canExportData: boolean;
        canManageUsers: boolean;
        canManageOrganization: boolean;
    };
    settings: {
        notifications: {
            emailNotifications: boolean;
            pushNotifications: boolean;
            meetingReminders: boolean;
            weeklyReports: boolean;
        };
        preferences: {
            darkMode: boolean;
            autoSave: boolean;
            showAnimations: boolean;
            compactView: boolean;
            defaultSpinDuration: number;
            defaultExcludeRecent: boolean;
        };
    };
    auth: {
        passwordHash?: string;
        salt?: string;
        twoFactorSecret?: string;
        twoFactorEnabled: boolean;
        resetToken?: string;
        resetTokenExpiry?: Date;
        emailVerified: boolean;
        emailVerificationToken?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
        // Removed index: true since we have compound indexes below
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    department: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        trim: true
    },
    organizationRole: {
        type: String,
        enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
        default: 'member',
        required: true
    },
    avatarUrl: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
        // Removed index: true since we have compound index below
    },
    lastLogin: {
        type: Date
        // Removed index: true to avoid conflicts
    },
    permissions: {
        canCreateMeetings: { type: Boolean, default: true },
        canManageTeams: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canManageOrganization: { type: Boolean, default: false }
    },
    settings: {
        notifications: {
            emailNotifications: { type: Boolean, default: true },
            pushNotifications: { type: Boolean, default: true },
            meetingReminders: { type: Boolean, default: true },
            weeklyReports: { type: Boolean, default: false }
        },
        preferences: {
            darkMode: { type: Boolean, default: false },
            autoSave: { type: Boolean, default: true },
            showAnimations: { type: Boolean, default: true },
            compactView: { type: Boolean, default: false },
            defaultSpinDuration: { type: Number, default: 3000, min: 1000, max: 10000 },
            defaultExcludeRecent: { type: Boolean, default: true }
        }
    },
    auth: {
        passwordHash: { type: String },
        salt: { type: String },
        twoFactorSecret: { type: String },
        twoFactorEnabled: { type: Boolean, default: false },
        resetToken: { type: String },
        resetTokenExpiry: { type: Date },
        emailVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            delete ret.auth; // Never expose auth data in JSON
            return ret;
        }
    }
});

// Compound indexes for multi-tenancy
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true }); // Unique email per organization
UserSchema.index({ organizationId: 1, department: 1 });
UserSchema.index({ organizationId: 1, organizationRole: 1 });
UserSchema.index({ organizationId: 1, isActive: 1 });

// Virtual for organization reference
UserSchema.virtual('organization', {
    ref: 'Organization',
    localField: 'organizationId',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model<IUser>('User', UserSchema);
