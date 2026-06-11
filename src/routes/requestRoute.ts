import { Router } from 'express';
import { 
  createRequest, 
  getAllRequests, 
  fulfillRequest, 
  markAsFulfilled 
} from '../controller/requestController';
import { protect } from '../middleware/auth';

const router = Router();

// Public Routes
router.get('/', getAllRequests);

// Protected Routes
router.post('/', protect, createRequest);
router.post('/fulfill', protect, fulfillRequest);
router.post('/mark-fulfilled', protect, markAsFulfilled);

export default router;