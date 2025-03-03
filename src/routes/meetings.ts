import { Router } from 'express';
import { getMeetings, createMeeting, getMeetingById, updateMeeting, deleteMeeting, addParticipantsToMeeting } from '../controllers/meetings';
import multer from 'multer';

const router = Router();
const upload = multer();

router.get('/', getMeetings);
router.post('/', createMeeting);
router.post('/:meetingId/add-participants', upload.single("file"), addParticipantsToMeeting);
router.get('/:id', getMeetingById);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;
