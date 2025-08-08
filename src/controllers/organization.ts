import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization';
import User from '../models/User';
import { addOrgId } from '../middleware/multiTenant';

/**
 * Create a new organization (for signup)
 */
export const createOrganization: RequestHandler = async (req, res) => {
    try {
        const {
            organizationName,
            organizationSlug,
            organizationDomain,
            organizationIndustry,
            organizationSize,
            userName,
            userEmail,
            userPassword,
            subscriptionPlan = 'free'
        } = req.body;

        // Validate required fields
        if (!organizationName || !organizationSlug || !userName || !userEmail || !userPassword) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'Organization name, slug, user name, email, and password are required'
            });
            return;
        }

        // Check if organization slug is already taken
        const existingOrg = await Organization.findOne({ slug: organizationSlug });
        if (existingOrg) {
            res.status(409).json({
                error: 'Organization slug taken',
                message: 'This organization identifier is already in use'
            });
            return;
        }

        // Check if domain is already taken (if provided)
        if (organizationDomain) {
            const existingDomain = await Organization.findOne({ domain: organizationDomain });
            if (existingDomain) {
                res.status(409).json({
                    error: 'Domain already registered',
                    message: 'This domain is already registered to another organization'
                });
                return;
            }
        }

        // Create organization
        const organization = new Organization({
            name: organizationName,
            slug: organizationSlug,
            domain: organizationDomain,
            industry: organizationIndustry,
            size: organizationSize,
            subscription: {
                plan: subscriptionPlan,
                status: subscriptionPlan === 'free' ? 'active' : 'trial',
                maxUsers: getMaxUsersForPlan(subscriptionPlan),
                features: getFeaturesForPlan(subscriptionPlan),
                endDate: subscriptionPlan !== 'free' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined // 14 days trial
            }
        });

        await organization.save();

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(userPassword, salt);

        // Create owner user
        const user = new User({
            organizationId: organization._id,
            name: userName,
            email: userEmail,
            organizationRole: 'owner',
            permissions: {
                canCreateMeetings: true,
                canManageTeams: true,
                canViewAnalytics: true,
                canExportData: true,
                canManageUsers: true,
                canManageOrganization: true
            },
            auth: {
                passwordHash,
                salt,
                emailVerified: false
            }
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, organizationId: organization._id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Organization created successfully',
            organization: {
                id: organization._id,
                name: organization.name,
                slug: organization.slug,
                subscription: organization.subscription
            },
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.organizationRole
            },
            token
        });

        return;
    } catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({
            error: 'Error creating organization',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};

/**
 * Get current organization details
 */
export const getCurrentOrganization: RequestHandler = async (req, res) => {
    try {
        if (!req.organization) {
            res.status(400).json({
                error: 'Organization context required'
            });
            return;
        }

        const organization = await Organization.findById(req.organization._id);

        if (!organization) {
            res.status(404).json({
                error: 'Organization not found'
            });
            return;
        }

        // Get user count
        const userCount = await User.countDocuments({
            organizationId: organization._id,
            isActive: true
        });

        res.json({
            organization: {
                id: organization._id,
                name: organization.name,
                slug: organization.slug,
                domain: organization.domain,
                description: organization.description,
                industry: organization.industry,
                size: organization.size,
                logo: organization.logo,
                settings: organization.settings,
                subscription: organization.subscription,
                security: organization.security,
                userCount,
                createdAt: organization.createdAt,
                updatedAt: organization.updatedAt
            }
        });
        return;

    } catch (error) {
        console.error('Error getting organization:', error);
        res.status(500).json({
            error: 'Error fetching organization details',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
};

/**
 * Update organization details
 */
export const updateOrganization: RequestHandler = async (req, res) => {
    try {
        if (!req.organization) {
            res.status(400).json({
                error: 'Organization context required'
            });
            return;
        }

        const {
            name,
            description,
            industry,
            domain,
            logo,
            settings,
            security
        } = req.body;

        const updateData: any = {};

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (industry) updateData.industry = industry;
        if (domain !== undefined) updateData.domain = domain;
        if (logo !== undefined) updateData.logo = logo;
        if (settings) updateData.settings = { ...updateData.settings, ...settings };
        if (security) updateData.security = { ...updateData.security, ...security };

        // Check if domain is already taken (if being updated)
        if (domain && domain !== req.organization.settings?.domain) {
            const existingDomain = await Organization.findOne({
                domain,
                _id: { $ne: req.organization._id }
            });
            if (existingDomain) {
                res.status(409).json({
                    error: 'Domain already registered',
                    message: 'This domain is already registered to another organization'
                });
                return;
            }
        }

        const organization = await Organization.findByIdAndUpdate(
            req.organization._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Organization updated successfully',
            organization: {
                id: organization?._id,
                name: organization?.name,
                slug: organization?.slug,
                domain: organization?.domain,
                description: organization?.description,
                industry: organization?.industry,
                size: organization?.size,
                logo: organization?.logo,
                settings: organization?.settings,
                security: organization?.security,
                updatedAt: organization?.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({
            error: 'Error updating organization',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get organization users
 */
export const getOrganizationUsers: RequestHandler = async (req, res) => {
    try {
        if (!req.organization) {
            res.status(400).json({
                error: 'Organization context required'
            });
            return;
        }

        const users = await User.find({
            organizationId: req.organization._id
        })
            .select('-auth') // Exclude auth data
            .sort({ createdAt: -1 });

        res.json({
            users: users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department,
                role: user.role,
                organizationRole: user.organizationRole,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                permissions: user.permissions,
                createdAt: user.createdAt
            }))
        });

    } catch (error) {
        console.error('Error getting organization users:', error);
        res.status(500).json({
            error: 'Error fetching organization users',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Invite user to organization
 */
export const inviteUser: RequestHandler = async (req, res) => {
    try {
        if (!req.organization) {
            res.status(400).json({
                error: 'Organization context required'
            });
            return;
        }

        const { email, name, role = 'member', organizationRole = 'member', permissions } = req.body;

        if (!email || !name) {
            res.status(400).json({
                error: 'Email and name are required'
            });
            return;
        }

        // Check subscription limits
        const userCount = await User.countDocuments({
            organizationId: req.organization._id,
            isActive: true
        });

        if (userCount >= req.organization.subscription.maxUsers) {
            res.status(403).json({
                error: 'User limit exceeded',
                message: 'Your subscription plan allows only ' + req.organization.subscription.maxUsers + ' users',
                upgradeRequired: true
            });
            return;
        }

        // Check if user already exists in this organization
        const existingUser = await User.findOne({
            organizationId: req.organization._id,
            email: email.toLowerCase()
        });

        if (existingUser) {
            res.status(409).json({
                error: 'User already exists',
                message: 'A user with this email already exists in this organization'
            });
            return;
        }

        // Create user with temporary password (they'll need to set it up)
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        const user = new User({
            organizationId: req.organization._id,
            name,
            email: email.toLowerCase(),
            role,
            organizationRole,
            permissions: permissions || getDefaultPermissions(organizationRole),
            auth: {
                passwordHash,
                salt,
                emailVerified: false
            }
        });

        await user.save();

        // TODO: Send invitation email with setup link

        res.status(201).json({
            message: 'User invited successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                organizationRole: user.organizationRole,
                permissions: user.permissions
            }
        });

    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({
            error: 'Error inviting user',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Helper functions
function getMaxUsersForPlan(plan: string): number {
    const limits = {
        free: 5,
        basic: 25,
        pro: 100,
        enterprise: 1000
    };
    return limits[plan as keyof typeof limits] || 5;
}

function getFeaturesForPlan(plan: string): string[] {
    const features = {
        free: ['basicAnalytics', 'export'],
        basic: ['basicAnalytics', 'export', 'teams', 'advancedSettings'],
        pro: ['basicAnalytics', 'export', 'teams', 'advancedSettings', 'advancedAnalytics', 'customBranding'],
        enterprise: ['basicAnalytics', 'export', 'teams', 'advancedSettings', 'advancedAnalytics', 'customBranding', 'apiAccess', 'sso']
    };
    return features[plan as keyof typeof features] || features.free;
}

function getDefaultPermissions(role: string) {
    const defaults = {
        viewer: {
            canCreateMeetings: false,
            canManageTeams: false,
            canViewAnalytics: false,
            canExportData: false,
            canManageUsers: false,
            canManageOrganization: false
        },
        member: {
            canCreateMeetings: true,
            canManageTeams: false,
            canViewAnalytics: false,
            canExportData: false,
            canManageUsers: false,
            canManageOrganization: false
        },
        manager: {
            canCreateMeetings: true,
            canManageTeams: true,
            canViewAnalytics: true,
            canExportData: true,
            canManageUsers: false,
            canManageOrganization: false
        },
        admin: {
            canCreateMeetings: true,
            canManageTeams: true,
            canViewAnalytics: true,
            canExportData: true,
            canManageUsers: true,
            canManageOrganization: false
        },
        owner: {
            canCreateMeetings: true,
            canManageTeams: true,
            canViewAnalytics: true,
            canExportData: true,
            canManageUsers: true,
            canManageOrganization: true
        }
    };
    return defaults[role as keyof typeof defaults] || defaults.member;
}
