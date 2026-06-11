import { Schema, model, Document } from 'mongoose';

export type UserRole = 'student' | 'expert' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  department: string;
  role: UserRole;
  semester?: number;
  expertise?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  department: { type: String, required: true, trim: true },
  role: { type: String, enum: ['student', 'expert', 'admin'], default: 'student' },
  semester: { 
    type: Number, 
    required: function(this: IUser) { return this.role === 'student'; } 
  },
  expertise: { 
    type: String, 
    required: function(this: IUser) { return this.role === 'expert'; },
    trim: true 
  }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);