import { Schema, model, Document, Types } from 'mongoose';

export interface IRequest extends Document {
  title: string;
  subject: string;
  semester: number;
  description: string;
  requestedBy: Types.ObjectId;
  status: 'open' | 'fulfilled';
  fulfilledBy?: Schema.Types.ObjectId;
  fulfilledNote?: Schema.Types.ObjectId;
  helpPoints: number;
  createdAt: Date;
}

const requestSchema = new Schema<IRequest>({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: Number, required: true },
  description: { type: String, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'fulfilled'], default: 'open' },
  fulfilledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  fulfilledNote: { type: Schema.Types.ObjectId, ref: 'Note' },
  helpPoints: { type: Number, default: 0 }
}, { timestamps: true });

export const Request = model<IRequest>('Request', requestSchema);