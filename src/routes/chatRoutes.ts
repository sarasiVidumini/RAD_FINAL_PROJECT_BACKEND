import { Router } from 'express';
import { 
  sendMessage, 
  getConversation, 
  updateMessage, 
  deleteMessage, 
  verifyChatUserEmail,
  getExpertChats 
} from '../controller/chatController';
import { protect } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Security Route Handlers
router.post('/verify-email', protect, verifyChatUserEmail); 

// ✅ GET /api/chats -> Fetches chat channels matching your token profiles
router.get('/', protect, getExpertChats);

// ✅ FIXED: Captures the frontend's explicit pipeline path template structure
// Matches: POST /api/chats/:chatId/messages
router.post('/:chatId/messages', protect, sendMessage);

// Alternate utility handlers
router.get('/:userId', protect, getConversation);
router.put('/:messageId', protect, updateMessage);
router.delete('/:messageId', protect, deleteMessage);

// Combined Asset Pipeline Upload Handler
router.post('/upload', protect, upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file asset attached for processing." });
  }
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  return res.status(200).json({ fileUrl });
});

export default router;