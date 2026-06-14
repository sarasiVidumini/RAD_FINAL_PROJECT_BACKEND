import { Router } from 'express';
import { sendMessage, getConversation, updateMessage, deleteMessage } from '../controller/chatController';
import { protect } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer disk engine configuration for storing media attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure an 'uploads' directory exists in your backend root folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Chat Core Message API Handlers
router.post('/', protect, sendMessage);
router.get('/:userId', protect, getConversation);
router.put('/:messageId', protect, updateMessage);
router.delete('/:messageId', protect, deleteMessage);

// Combined Asset Pipeline Upload Handler to fix the 404 asset pipeline error
router.post('/upload', protect, upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file asset attached for processing." });
  }
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  return res.status(200).json({ fileUrl });
});

export default router;