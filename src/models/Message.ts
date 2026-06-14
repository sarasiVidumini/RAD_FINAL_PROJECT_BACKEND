import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: Schema.Types.ObjectId;
  receiver: Schema.Types.ObjectId;
  content: string;
  attachments: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { 
      type: String, 
      required: function(this: IMessage): boolean { 
        return !this.attachments || this.attachments.length === 0; 
      } 
    },
    attachments: [{ type: String, default: [] }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = model<IMessage>('Message', MessageSchema);