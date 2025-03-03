import { Router } from 'express';
import { getAllMeetings, createMeeting, getMeetingById, updateMeeting, getOneMeetingParticipants, deleteMeeting, addParticipantsToMeeting } from '../controllers/meetings';
import multer from 'multer';

const router = Router();
const upload = multer();

router.get('/', getAllMeetings);
router.post('/', createMeeting);
router.post('/:meetingId/add-participants', upload.single("file"), addParticipantsToMeeting);
router.get('/:meetingId/participants', getOneMeetingParticipants);
router.get('/:id', getMeetingById);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;
