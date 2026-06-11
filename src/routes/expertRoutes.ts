import { Router } from 'express';
import { protect, authorizeRoles } from '../middleware/auth';
import { 
  getAllExperts, 
  updateExpert, 
  deleteExpert 
} from '../controller/expertController';

const router = Router();

// GET ALL: Accessible by any logged-in user (Student, Expert, Admin)
router.get('/', protect, getAllExperts);

// PUT: Restrict profile changes strictly to Super Administrators
router.put('/:id', protect, authorizeRoles('admin'), updateExpert);

// DELETE: Restrict account deletions strictly to Super Administrators
router.delete('/:id', protect, authorizeRoles('admin'), deleteExpert);

export default router;