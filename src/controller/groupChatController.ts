import { Server, Socket } from 'socket.io';
import { GroupMessage } from '../routes/chatRoutes';

export const initializeGroupChatSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`⚡ Real-time chat client connected: ${socket.id}`);

    // 1. Listen for outbound messages transmitted via frontend layouts
    socket.on('send_group_message', async (messageData: any) => {
      try {
        const userEmail = messageData.sender?.email?.trim().toLowerCase();

        // Administrative Role Override Check
        if (userEmail === 'admin@glowcare.ai' || userEmail === 'admin@notevault.com') {
          if (messageData.sender) {
            messageData.sender.role = 'admin';
          }
        }

        // Save real-time payload cleanly inside your database cluster
        const savedMessage = await GroupMessage.create({
          text: messageData.text,
          fileUrl: messageData.fileUrl,
          cameraSnapshot: messageData.cameraSnapshot,
          fileName: messageData.fileName,
          emoji: messageData.emoji,
          sender: messageData.sender
        });

        // Broadcast payload down to every active socket instance
        io.emit('receive_group_message', savedMessage);
      } catch (error) {
        console.error("Critical error processing live group message broadcast:", error);
      }
    });

    // 2. Listen for text edits/updates to a specific message
    socket.on('edit_group_message', async (data: { messageId: string; text: string; userEmail: string }) => {
      try {
        const message = await GroupMessage.findById(data.messageId);
        if (!message) return;

        // Security check: Verify sender email matches the request
        if (message.sender?.email?.trim().toLowerCase() === data.userEmail.trim().toLowerCase()) {
          message.text = data.text;
          await message.save();
          
          // Broadcast the updated message state to all online instances
          io.emit('group_message_updated', message);
        }
      } catch (error) {
        console.error("Error editing group message payload:", error);
      }
    });

    // 3. Listen for message deletion requests (Admin Override exclusive)
    socket.on('delete_group_message', async (data: { messageId: string; adminEmail: string }) => {
      try {
        const callerEmail = data.adminEmail.trim().toLowerCase();
        
        // Strict Admin verification check
        if (callerEmail === 'admin@glowcare.ai' || callerEmail === 'admin@notevault.com') {
          await GroupMessage.findByIdAndDelete(data.messageId);
          
          // Broadcast deletion down to sync layout trees
          io.emit('group_message_deleted', { messageId: data.messageId });
        }
      } catch (error) {
        console.error("Admin message deletion processing failed:", error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Real-time chat client disconnected: ${socket.id}`);
    });
  });
};