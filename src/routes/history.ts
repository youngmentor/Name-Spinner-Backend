import express, { Router } from 'express';
import { getSelectionHistory, createSelectionRecord, clearSelectionHistory, selectParticipant } from '../controllers/history';


const router: Router = express.Router();


router.get('/', getSelectionHistory);
router.post('/', createSelectionRecord);
router.post('/select', selectParticipant);
router.delete('/clear', clearSelectionHistory);

export default router;
