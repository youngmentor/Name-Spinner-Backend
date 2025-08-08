import { Router } from 'express';
import {
    login,
    getProfile,
    updateProfile,
    changePassword,
    logout
} from '../controllers/auth';
import { resolveOrganization, authenticateUser } from '../middleware/multiTenant';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /api/auth/logout
 * @desc User logout
 * @access Public
 */
router.post('/logout', logout);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', resolveOrganization, authenticateUser, getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', resolveOrganization, authenticateUser, updateProfile);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', resolveOrganization, authenticateUser, changePassword);

export default router;
