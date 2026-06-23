// src/routes/chatRoutes.ts
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
import { User } from '../models/user'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

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

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * ==========================================
 * PUBLIC GROUP SCHEMAS & DATABASE CONFIGS
 * ==========================================
 */
const GroupMessageSchema = new mongoose.Schema({
  text: String,
  fileUrl: String,       
  cameraSnapshot: String, 
  fileName: String,
  emoji: String,
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage', GroupMessageSchema);

const GroupMembershipSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true, lowercase: true },
  addedBy: { type: String, default: 'admin@glowcare.ai' }
});

export const GroupMembership = mongoose.models.GroupMembership || mongoose.model('GroupMembership', GroupMembershipSchema);


/**
 * ==========================================
 * SECURE SYSTEM PUBLIC GROUP CHAT ENDPOINTS
 * ==========================================
 */

// FIXES FRONTEND 400 ERROR: Direct route context for message logs syncing downwards
router.get('/history', protect, async (req: any, res: any) => {
  try {
    const historyLogs = await GroupMessage.find({}).sort({ timestamp: 1 }).limit(150);
    return res.status(200).json(historyLogs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to extract historical chat stream matrix." });
  }
});

// Identity verification gate
router.post('/public-group/verify-identity', protect, async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Verification email is required." });

  try {
    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ message: "Identity Rejected: User email not found." });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        name: targetUser.name,
        role: targetUser.role,
        email: targetUser.email
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal identity verification pipeline error.", error });
  }
});

// Membership security clearance checker
router.get('/public-group/check-membership/:email', protect, async (req: any, res: any) => {
  try {
    const email = req.params.email.toLowerCase();
    
    if (email === 'admin@glowcare.ai' || email === 'admin@notevault.com') {
      return res.status(200).json({ allowed: true });
    }

    const membership = await GroupMembership.findOne({ userEmail: email });
    if (!membership) {
      return res.status(200).json({ allowed: false, message: "Access restricted. Contact System Admin." });
    }

    return res.status(200).json({ allowed: true });
  } catch (error) {
    return res.status(500).json({ message: "Error searching group registration tables." });
  }
});

// Admin access whitelister
router.post('/public-group/add-member', protect, async (req: any, res: any) => {
  const { targetEmail } = req.body;
  const adminEmail = req.user?.email?.toLowerCase();

  if (adminEmail !== 'admin@glowcare.ai' && adminEmail !== 'admin@notevault.com') {
    return res.status(403).json({ message: "Access Denied: Admin authorization required." });
  }

  try {
    const userToWhitelist = await User.findOne({ email: targetEmail.toLowerCase() });
    if (!userToWhitelist) {
      return res.status(404).json({ message: "Target user profile does not exist." });
    }

    const existingMembership = await GroupMembership.findOne({ userEmail: targetEmail.toLowerCase() });
    if (existingMembership) {
      return res.status(400).json({ message: "User is already an authorized member." });
    }

    await GroupMembership.create({ userEmail: targetEmail.toLowerCase(), addedBy: adminEmail });
    return res.status(200).json({ message: `Successfully added ${userToWhitelist.name} to the group directory.` });
  } catch (error) {
    return res.status(500).json({ message: "Error modifying group membership records." });
  }
});

// Rest of your pre-existing endpoints
router.get('/public-group/messages', protect, async (req: any, res: any) => {
  try {
    const chatLogs = await GroupMessage.find({}).sort({ timestamp: 1 });
    return res.status(200).json(chatLogs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to extract chat history streams." });
  }
});

router.post('/public-group/messages', protect, async (req: any, res: any) => {
  const { text, cameraSnapshot, fileName, emoji, sender } = req.body;
  try {
    const messageNode = await GroupMessage.create({ text, cameraSnapshot, fileName, emoji, sender });
    return res.status(201).json(messageNode);
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit outbound group chat entry packet." });
  }
});

router.put('/public-group/messages/:id', protect, async (req: any, res: any) => {
  try {
    const modifiedLog = await GroupMessage.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true });
    return res.status(200).json(modifiedLog);
  } catch (error) {
    return res.status(500).json({ message: "Failed to modify historical public group chat entry log." });
  }
});

router.delete('/public-group/messages/:id', protect, async (req: any, res: any) => {
  try {
    await GroupMessage.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Message removed from public group chat terminal." });
  } catch (error) {
    return res.status(500).json({ message: "Message deletion transaction workflow crashed." });
  }
});

router.post('/verify-email', protect, verifyChatUserEmail); 
router.get('/', protect, getExpertChats);
router.post('/:chatId/messages', protect, sendMessage);
router.get('/:userId', protect, getConversation);
router.put('/:messageId', protect, updateMessage);
router.delete('/:messageId', protect, deleteMessage);

router.post('/upload', protect, upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file asset attached for processing." });
  }
  const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;
  return res.status(200).json({ fileUrl });
});

export default router;