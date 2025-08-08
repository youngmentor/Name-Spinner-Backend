import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    slug: string; // URL-friendly identifier
    domain?: string; // Optional custom domain
    logo?: string;
    description?: string;
    industry?: string;
    size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    settings: {
        allowTeamCreation: boolean;
        maxTeams?: number;
        maxMeetings?: number;
        maxParticipants?: number;
        enableAdvancedAnalytics: boolean;
        enableExport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        retentionDays: number; // Data retention period
    };
    subscription: {
        plan: 'free' | 'basic' | 'pro' | 'enterprise';
        status: 'active' | 'suspended' | 'cancelled' | 'trial';
        billingCycle: 'monthly' | 'yearly';
        startDate: Date;
        endDate?: Date;
        maxUsers: number;
        features: string[];
    };
    billing: {
        email?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
        paymentMethod?: string;
        lastPayment?: Date;
        nextPayment?: Date;
    };
    security: {
        enforceSSO: boolean;
        allowedDomains: string[];
        passwordPolicy: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumbers: boolean;
            requireSpecialChars: boolean;
        };
        sessionTimeout: number; // in minutes
        twoFactorRequired: boolean;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    domain: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // Allows multiple null values but unique non-null values
        match: [/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid domain']
    },
    logo: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    industry: {
        type: String,
        trim: true,
        enum: ['technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing', 'consulting', 'other']
    },
    size: {
        type: String,
        required: true,
        enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
        default: 'small'
    },
    settings: {
        allowTeamCreation: { type: Boolean, default: true },
        maxTeams: { type: Number, min: 1 },
        maxMeetings: { type: Number, min: 1 },
        maxParticipants: { type: Number, min: 1 },
        enableAdvancedAnalytics: { type: Boolean, default: false },
        enableExport: { type: Boolean, default: true },
        customBranding: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        retentionDays: { type: Number, default: 365, min: 30, max: 2555 } // Max ~7 years
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'pro', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'cancelled', 'trial'],
            default: 'trial'
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        maxUsers: { type: Number, default: 5, min: 1 },
        features: [{ type: String }]
    },
    billing: {
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            zipCode: { type: String, trim: true },
            country: { type: String, trim: true }
        },
        paymentMethod: { type: String, trim: true },
        lastPayment: { type: Date },
        nextPayment: { type: Date }
    },
    security: {
        enforceSSO: { type: Boolean, default: false },
        allowedDomains: [{ type: String, trim: true, lowercase: true }],
        passwordPolicy: {
            minLength: { type: Number, default: 8, min: 6, max: 128 },
            requireUppercase: { type: Boolean, default: true },
            requireLowercase: { type: Boolean, default: true },
            requireNumbers: { type: Boolean, default: true },
            requireSpecialChars: { type: Boolean, default: false }
        },
        sessionTimeout: { type: Number, default: 480, min: 30, max: 1440 }, // 8 hours default, max 24 hours
        twoFactorRequired: { type: Boolean, default: false }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
// Note: slug and domain already have unique/sparse indexes from field definitions
OrganizationSchema.index({ 'subscription.status': 1 });
OrganizationSchema.index({ isActive: 1 });
OrganizationSchema.index({ createdAt: -1 });

// Virtual for full URL
OrganizationSchema.virtual('url').get(function (this: IOrganization) {
    return this.domain || `${this.slug}.namespinner.com`;
});

// Virtual for subscription status
OrganizationSchema.virtual('isSubscriptionActive').get(function (this: IOrganization) {
    return this.subscription.status === 'active' ||
        (this.subscription.status === 'trial' &&
            (!this.subscription.endDate || this.subscription.endDate > new Date()));
});

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
