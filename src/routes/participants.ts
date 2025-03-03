import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/upoadFileController';
import { createParticipants, deleteParticipant, getParticipantById, getParticipants, updateParticipant } from '../controllers/participants';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();



router.get('/', getParticipants);
router.post('/batch', createParticipants);
router.get('/:id', getParticipantById);
router.put('/:id', updateParticipant);
router.delete('/:id', deleteParticipant);
router.post("/upload", upload.single("file"), uploadFile);

export default router;
