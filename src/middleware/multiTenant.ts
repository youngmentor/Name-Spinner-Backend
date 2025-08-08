import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Organization from '../models/Organization';

// Extend the Request interface to include user and organization
declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                organizationId: string;
                organizationRole: string;
                email: string;
                name: string;
                permissions: any;
            };
            organization?: {
                _id: string;
                name: string;
                slug: string;
                settings: any;
                subscription: any;
                isActive: boolean;
            };
        }
    }
}

/**
 * Extract organization from subdomain or domain
 */
export const extractOrganizationIdentifier = (req: Request): string | null => {
    const host = req.get('host') || '';

    // Check for custom domain first
    const customDomainOrg = process.env.CUSTOM_DOMAINS &&
        JSON.parse(process.env.CUSTOM_DOMAINS)[host];

    if (customDomainOrg) {
        return customDomainOrg;
    }

    // Check for subdomain (e.g., acme.namespinner.com)
    const subdomain = host.split('.')[0];
    const baseDomains = ['namespinner.com', 'localhost'];

    if (baseDomains.some(domain => host.includes(domain)) && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
    }

    // Fallback: check for organization ID/slug in headers
    return req.get('X-Organization-ID') || req.get('X-Organization-Slug') || null;
};

/**
 * Middleware to resolve and validate organization
 */
export const resolveOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgIdentifier = extractOrganizationIdentifier(req);

        if (!orgIdentifier) {
            res.status(400).json({
                error: 'Organization not specified',
                message: 'Please access via organization subdomain or provide organization identifier'
            });
            return;
        }

        // Find organization by slug or ID
        const organization = await Organization.findOne({
            $or: [
                { slug: orgIdentifier },
                { _id: orgIdentifier }
            ],
            isActive: true
        }).lean();

        if (!organization) {
            res.status(404).json({
                error: 'Organization not found',
                message: 'The specified organization does not exist or is inactive'
            });
            return;
        }

        // Check if organization's subscription is active
        if (!organization.subscription ||
            !['active', 'trial'].includes(organization.subscription.status)) {
            res.status(403).json({
                error: 'Organization subscription inactive',
                message: 'This organization\'s subscription is not active'
            });
            return;
        }

        // Check trial expiration
        if (organization.subscription.status === 'trial' &&
            organization.subscription.endDate &&
            organization.subscription.endDate < new Date()) {
            res.status(403).json({
                error: 'Trial expired',
                message: 'This organization\'s trial period has expired'
            });
            return;
        }

        req.organization = {
            _id: organization._id.toString(),
            name: organization.name,
            slug: organization.slug,
            settings: organization.settings,
            subscription: organization.subscription,
            isActive: organization.isActive
        };

        next();
    } catch (error) {
        console.error('Error resolving organization:', error);
        res.status(500).json({
            error: 'Error resolving organization',
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware to authenticate user and check organization membership
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                error: 'Access denied',
                message: 'No authentication token provided'
            });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

        const user = await User.findById(decoded.userId)
            .select('-auth') // Exclude auth data
            .lean();

        if (!user || !user.isActive) {
            res.status(401).json({
                error: 'Invalid token',
                message: 'User not found or inactive'
            });
            return;
        }

        // Verify user belongs to the organization
        if (req.organization && user.organizationId.toString() !== req.organization._id) {
            res.status(403).json({
                error: 'Access denied',
                message: 'User does not belong to this organization'
            });
            return;
        }

        req.user = {
            _id: user._id.toString(),
            organizationId: user.organizationId.toString(),
            organizationRole: user.organizationRole,
            email: user.email,
            name: user.name,
            permissions: user.permissions
        };

        next();
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'Please authenticate to access this resource'
            });
            return;
        }

        // Super admins (owners) have all permissions
        if (req.user.organizationRole === 'owner') {
            next();
            return;
        }

        // Check specific permission
        if (!req.user.permissions || !req.user.permissions[permission]) {
            res.status(403).json({
                error: 'Insufficient permissions',
                message: `You don't have permission to ${permission.replace(/([A-Z])/g, ' $1').toLowerCase()}`
            });
            return;
        }

        next();
    };
};

/**
 * Middleware to check organization role level
 */
export const requireRole = (minRole: 'viewer' | 'member' | 'manager' | 'admin' | 'owner') => {
    const roleHierarchy = ['viewer', 'member', 'manager', 'admin', 'owner'];

    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'Please authenticate to access this resource'
            });
            return;
        }

        const userRoleIndex = roleHierarchy.indexOf(req.user.organizationRole);
        const minRoleIndex = roleHierarchy.indexOf(minRole);

        if (userRoleIndex < minRoleIndex) {
            res.status(403).json({
                error: 'Insufficient role',
                message: `This action requires ${minRole} role or higher`
            });
            return;
        }

        next();
    };
};

/**
 * Middleware to check subscription features
 */
export const requireFeature = (feature: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.organization) {
            res.status(400).json({
                error: 'Organization context required',
                message: 'This operation requires organization context'
            });
            return;
        }

        const subscription = req.organization.subscription;

        // Check if feature is included in subscription
        if (!subscription.features || !subscription.features.includes(feature)) {
            res.status(403).json({
                error: 'Feature not available',
                message: `This feature is not included in your current subscription plan`,
                upgradeRequired: true,
                currentPlan: subscription.plan
            });
            return;
        }

        next();
    };
};

/**
 * Utility function to add organization filter to MongoDB queries
 */
export const addOrgFilter = (req: Request, filter: any = {}) => {
    if (req.organization) {
        filter.organizationId = req.organization._id;
    }
    return filter;
};

/**
 * Utility function to add organization ID to document creation
 */
export const addOrgId = (req: Request, data: any = {}) => {
    if (req.organization) {
        data.organizationId = req.organization._id;
    }
    return data;
};
