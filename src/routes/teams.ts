import { Router } from 'express';
import {
    getAllTeams,
    createTeam,
    getTeamById,
    updateTeam,
    deleteTeam,
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
    getTeamPerformance
} from '../controllers/teams';

const router = Router();

/**
 * @route GET /api/teams
 * @desc Get all teams
 * @access Public
 */
router.get('/', getAllTeams);

/**
 * @route POST /api/teams
 * @desc Create a new team
 * @access Public
 */
router.post('/', createTeam);

/**
 * @route GET /api/teams/:id
 * @desc Get team by ID
 * @access Public
 */
router.get('/:id', getTeamById);

/**
 * @route PUT /api/teams/:id
 * @desc Update team
 * @access Public
 */
router.put('/:id', updateTeam);

/**
 * @route DELETE /api/teams/:id
 * @desc Delete team
 * @access Public
 */
router.delete('/:id', deleteTeam);

/**
 * @route GET /api/teams/:id/members
 * @desc Get team members
 * @access Public
 */
router.get('/:id/members', getTeamMembers);

/**
 * @route POST /api/teams/:id/members
 * @desc Add team member
 * @access Public
 */
router.post('/:id/members', addTeamMember);

/**
 * @route DELETE /api/teams/:id/members/:memberId
 * @desc Remove team member
 * @access Public
 */
router.delete('/:id/members/:memberId', removeTeamMember);

/**
 * @route GET /api/teams/:id/performance
 * @desc Get team performance metrics
 * @access Public
 */
router.get('/:id/performance', getTeamPerformance);

export default router;
