import { Schema, model, Document } from 'mongoose';

export type UserRole = 'student' | 'expert' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;      // Made optional for Google Sign-In users
  department?: string;    // Made optional for Google Sign-In users
  role: UserRole;
  semester?: number;
  expertise?: string;
  googleId?: string;      // Added to track linked Google Accounts
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { 
    type: String, 
    // Only required if the account is NOT using Google Authentication
    required: function(this: IUser) { return !this.googleId; } 
  },
  department: { 
    type: String, 
    // Only required if the account is NOT using Google Authentication
    required: function(this: IUser) { return !this.googleId; }, 
    trim: true 
  },
  role: { type: String, enum: ['student', 'expert', 'admin'], default: 'student' },
  semester: { 
    type: Number, 
    required: function(this: IUser) { return this.role === 'student'; } 
  },
  expertise: { 
    type: String, 
    required: function(this: IUser) { return this.role === 'expert'; },
    trim: true 
  },
  googleId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);