import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Organization from '../models/Organization';

/**
 * User login
 */
export const login: RequestHandler = async (req, res) => {
    try {
        const { email, password, organizationSlug } = req.body;

        if (!email || !password) {
            res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
            return;
        }

        // Find organization
        let organization;
        if (organizationSlug) {
            organization = await Organization.findOne({
                slug: organizationSlug,
                isActive: true
            });
            if (!organization) {
                res.status(404).json({
                    error: 'Organization not found',
                    message: 'The specified organization does not exist'
                });
                return;
            }
        }

        // Find user
        const query: any = {
            email: email.toLowerCase(),
            isActive: true
        };

        if (organization) {
            query.organizationId = organization._id;
        }

        const user = await User.findOne(query);

        if (!user) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.auth.passwordHash || '');
        if (!isPasswordValid) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }

        // Get organization if not already fetched
        if (!organization) {
            organization = await Organization.findById(user.organizationId);
        }

        if (!organization || !organization.isActive) {
            res.status(403).json({
                error: 'Organization inactive',
                message: 'Your organization account is inactive'
            });
            return;
        }

        // Check subscription status
        if (!['active', 'trial'].includes(organization.subscription.status)) {
            res.status(403).json({
                error: 'Subscription inactive',
                message: 'Your organization subscription is not active'
            });
            return;
        }

        // Update last login
        await User.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                organizationId: user.organizationId
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.organizationRole,
                permissions: user.permissions
            },
            organization: {
                id: organization._id,
                name: organization.name,
                slug: organization.slug,
                subscription: organization.subscription
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            error: 'Login failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get current user profile
 */
export const getProfile: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required'
            });
            return;
        }

        const user = await User.findById(req.user._id)
            .select('-auth')
            .populate('organizationId', 'name slug subscription');

        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department,
                role: user.role,
                organizationRole: user.organizationRole,
                avatarUrl: user.avatarUrl,
                permissions: user.permissions,
                settings: user.settings,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            },
            organization: user.organizationId
        });

    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({
            error: 'Error fetching profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Update user profile
 */
export const updateProfile: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required'
            });
            return;
        }

        const { name, department, role, avatarUrl, settings } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (department !== undefined) updateData.department = department;
        if (role !== undefined) updateData.role = role;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (settings) updateData.settings = { ...updateData.settings, ...settings };

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-auth');

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user?._id,
                name: user?.name,
                email: user?.email,
                department: user?.department,
                role: user?.role,
                organizationRole: user?.organizationRole,
                avatarUrl: user?.avatarUrl,
                settings: user?.settings,
                updatedAt: user?.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            error: 'Error updating profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Change password
 */
export const changePassword: RequestHandler = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                error: 'Both current and new passwords are required'
            });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({
                error: 'New password must be at least 8 characters long'
            });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            user.auth.passwordHash || ''
        );

        if (!isCurrentPasswordValid) {
            res.status(401).json({
                error: 'Current password is incorrect'
            });
            return;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    'auth.passwordHash': newPasswordHash,
                    'auth.salt': salt
                }
            }
        );

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            error: 'Error changing password',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Logout (client-side token invalidation)
 */
export const logout: RequestHandler = async (req, res) => {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token. Here we just acknowledge the logout.
    res.json({
        message: 'Logged out successfully'
    });
};
