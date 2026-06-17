import { Response } from 'express';
import { Message } from '../models/Message';
import mongoose, { Types } from 'mongoose';

/**
 * Aggregates and fetches all active inbox threads for the logged-in expert, 
 * grouping messages by the distinct student conversations.
 * GET /api/chat/threads/expert
 */
export const getExpertChats = async (req: any, res: Response) => {
  try {
    const expertId = new Types.ObjectId(req.user.id);

    // Dynamic aggregation pipeline grouping direct message document histories
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: expertId }, { receiver: expertId }]
        }
      },
      {
        $sort: { createdAt: 1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", expertId] },
              "$receiver",
              "$sender"
            ]
          },
          messages: {
            $push: {
              _id: "$_id",
              senderId: "$sender",
              senderModel: {
                $cond: [{ $eq: ["$sender", expertId] }, "Expert", "Student"]
              },
              text: "$content",
              createdAt: "$createdAt"
            }
          },
          updatedAt: { $last: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: "users", // Target collection name matching your DB layout
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo"
      },
      {
        $project: {
          _id: 1,
          updatedAt: 1,
          messages: 1,
          student: {
            _id: "$studentInfo._id",
            name: "$studentInfo.name",
            email: "$studentInfo.email"
          }
        }
      },
      {
        $sort: { updatedAt: -1 }
      }
    ]);

    return res.status(200).json(threads);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Verifies if an email belongs to a registered user and returns their identity profile
 * POST /api/chat/verify-email
 */
export const verifyChatUserEmail = async (req: any, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email address is required for verification." });
    }

    const user = await mongoose.model("User").findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Access Denied: No user registered with this email address." });
    }

    return res.status(200).json({
      success: true,
      name: user.name,
      userId: user._id
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Handles sending a direct message with optional rich media file attachments
 * POST /api/chat
 */
/**
 * Handles sending a direct message targeting a structural pipeline route parameter
 * POST /api/chats/:chatId/messages
 */
export const sendMessage = async (req: any, res: Response) => {
  try {
    // 1. Capture the structural route parameter from the URL path pattern
    const { chatId } = req.params;
    
    // 2. Extract 'text' (matching frontend payload key) and attachments
    const { text, attachments } = req.body;

    // Validate parameter fallback to ensure an ID exists
    const receiverId = chatId;

    if (!receiverId || receiverId === 'undefined') {
      return res.status(400).json({ message: "Receiver ID path parameter is required." });
    }

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid Target User ID format supplied." });
    }

    // Validate that either text is present or an asset attachment is sent
    if (!text?.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: "Cannot send an empty message." });
    }

    // 3. Persist matching your internal schema structure
    const message = await Message.create({
      sender: new Types.ObjectId(req.user.id),
      receiver: new Types.ObjectId(receiverId),
      content: text ? text.trim() : "", // maps incoming front-end 'text' to backend 'content'
      attachments: attachments || []
    });

    // Formatting return architecture payload so UI layout renders changes fluidly
    return res.status(201).json({
      _id: message._id,
      senderId: message.sender,
      senderModel: "Expert",
      text: message.content, // Returns 'text' back to the UI state mapping arrays
      createdAt: message.createdAt
    });
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

    const currentLoggedInId = new Types.ObjectId(req.user.id);
    const targetPartnerId = new Types.ObjectId(userId);

    const messages = await Message.find({
      $or: [
        { sender: currentLoggedInId, receiver: targetPartnerId },
        { sender: targetPartnerId, receiver: currentLoggedInId }
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

    const message = await Message.findOne({ _id: messageId, sender: new Types.ObjectId(req.user.id) });
    if (!message) {
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

    const message = await Message.findOne({ _id: messageId, sender: new Types.ObjectId(req.user.id) });
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