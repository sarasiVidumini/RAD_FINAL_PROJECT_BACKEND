import { Schema, model, Document, Types } from 'mongoose';

export type NoteDocType = 'note' | 'paper';

export interface INote extends Document {
  title: string;
  subject: string;
  subjectCode: string;
  docType: NoteDocType;
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
  // Short code used to group notes into subject cards on the dashboard,
  // e.g. "PRF", "DBMS", "OOP", "SE". Always stored uppercase/trimmed.
  subjectCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  // 'note' = uploaded by student or expert, shown in the Notes tab
  // 'paper' = expert/admin only, shown in the Papers tab
  docType: {
    type: String,
    enum: ['note', 'paper'],
    default: 'note',
    required: true
  },
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

// Useful for the dashboard's grouped fetch (semester + subjectCode + docType)
noteSchema.index({ semester: 1, subjectCode: 1, docType: 1 });

export const Note = model<INote>('Note', noteSchema);