import { Schema, model, Document, Types } from 'mongoose';

export interface INote extends Document {
  title: string;
  subject: string;
  semester: number;
  description?: string;
  files: string[];
  uploadedBy: Types.ObjectId;
  downloads: number;
  ratings: Array<{
    user: Types.ObjectId;
    rating: number;
    comment?: string;
  }>;
  averageRating: number;
}

const noteSchema = new Schema<INote>({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: Number, required: true },
  description: String,
  files: [{ type: String, required: true }],
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  downloads: { type: Number, default: 0 },
  ratings: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String
  }],
  averageRating: { type: Number, default: 0 }
}, { timestamps: true });

export const Note = model<INote>('Note', noteSchema);