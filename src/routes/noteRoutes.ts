import { Router } from 'express';
import { protect, authorizeRoles } from '../middleware/auth';
import {
  getAllNotes,
  getMyNotes,
  uploadNote,
  updateNote,        
  rateNote,
  deleteNote,
  streamNoteFile
} from '../controller/noteController';
import { generateQuizFromNote } from '../controller/quizController';
import {upload} from '../middleware/upload';

const router = Router();

// STATIC PATHS
router.get('/', getAllNotes);
router.get('/my', protect, getMyNotes);

router.post(
  '/upload',
  protect,
  authorizeRoles('student', 'expert', 'admin'),
  upload.array('files', 3),
  uploadNote
);



router.post(
  '/generate-quiz',
  protect,
  generateQuizFromNote
);

// FIXED: Token signature extraction is managed completely dynamically inside streamNoteFile
router.get(
  '/:noteId/view',
  streamNoteFile
);

// DYNAMIC PARAMETER PATHS (last)
router.post('/:noteId/rate', protect, rateNote);
router.put('/:noteId', protect, updateNote);
router.delete('/:noteId', protect, deleteNote);

export default router;