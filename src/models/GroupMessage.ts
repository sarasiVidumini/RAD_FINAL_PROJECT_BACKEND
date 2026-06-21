import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMessage extends Document {
  text?: string;
  fileUrl?: string;
  fileName?: string;
  cameraSnapshot?: string;
  emoji?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  timestamp: Date;
}

const GroupMessageSchema: Schema = new Schema({
  text: { type: String, required: false },
  fileUrl: { type: String, required: false },
  fileName: { type: String, required: false },
  cameraSnapshot: { type: String, required: false },
  emoji: { type: String, required: false },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true }
  },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<IGroupMessage>('GroupMessage', GroupMessageSchema);