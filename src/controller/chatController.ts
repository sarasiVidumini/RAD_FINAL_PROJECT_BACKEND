import { Response } from 'express';
import { Message } from '../models/Message';
import mongoose, { Types } from 'mongoose';

/**
 * Handles sending a direct message with optional rich media file attachments
 * POST /api/chat
 */
export const sendMessage = async (req: any, res: Response) => {
  try {
    const { receiverId, content, attachments } = req.body;

    if (!receiverId || receiverId === 'undefined') {
      return res.status(400).json({ message: "Receiver ID is required." });
    }

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid Receiver ID format supplied." });
    }

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: "Cannot send an empty message." });
    }

    const message = await Message.create({
      sender: new Types.ObjectId(req.user.id),
      receiver: new Types.ObjectId(receiverId),
      content: content ? content.trim() : "",
      attachments: attachments || []
    });

    return res.status(201).json(message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves the entire chronological message stream safely validating incoming Hex IDs
 * GET /api/chat/:userId
 */
export const getConversation = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ message: "Target user ID parameter is required." });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid User ID format supplied." });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Modifies the content string context of an active chat document record
 * PUT /api/chat/:messageId
 */
export const updateMessage = async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!messageId || !mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Valid message identifier parameter is required." });
    }

    if (!content?.trim()) {
      return res.status(400).json({ message: "Updated content cannot be empty." });
    }

    const message = await Message.findOne({ _id: messageId, sender: req.user.id });
    if (!message) {
      // FIX: Changed non-standard status 444 to standard 403 Forbidden validation block
      return res.status(403).json({ message: "Message not found or unauthorized." });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message." });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    return res.json(message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Performs a protective soft-delete to maintain message timeline synchronization safely
 * DELETE /api/chat/:messageId
 */
export const deleteMessage = async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId || !mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Valid message identifier parameter is required." });
    }

    const message = await Message.findOne({ _id: messageId, sender: req.user.id });
    if (!message) {
      return res.status(404).json({ message: "Message not found or unauthorized." });
    }

    message.isDeleted = true;
    message.content = "This message was deleted.";
    message.attachments = [];
    await message.save();

    return res.json(message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};