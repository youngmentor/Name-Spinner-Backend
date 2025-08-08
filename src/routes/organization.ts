import { Router } from 'express';
import {
    createOrganization,
    getCurrentOrganization,
    updateOrganization,
    getOrganizationUsers,
    inviteUser
} from '../controllers/organization';
import { resolveOrganization, authenticateUser, requireRole, requirePermission } from '../middleware/multiTenant';

const router = Router();

/**
 * @route POST /api/organizations
 * @desc Create a new organization (signup)
 * @access Public
 */
router.post('/', createOrganization);

/**
 * @route GET /api/organization
 * @desc Get current organization details
 * @access Private (requires authentication)
 */
router.get('/', resolveOrganization, authenticateUser, getCurrentOrganization);

/**
 * @route PUT /api/organization
 * @desc Update organization details
 * @access Private (requires admin role)
 */
router.put('/', resolveOrganization, authenticateUser, requireRole('admin'), updateOrganization);

/**
 * @route GET /api/organization/users
 * @desc Get organization users
 * @access Private (requires user management permission)
 */
router.get('/users', resolveOrganization, authenticateUser, requirePermission('canManageUsers'), getOrganizationUsers);

/**
 * @route POST /api/organization/invite
 * @desc Invite user to organization
 * @access Private (requires user management permission)
 */
router.post('/invite', resolveOrganization, authenticateUser, requirePermission('canManageUsers'), inviteUser);

export default router;
