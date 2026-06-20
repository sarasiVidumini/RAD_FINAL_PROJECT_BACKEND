import { Request, Response } from 'express';
import { User, UserRole } from '../models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (id: string, role: UserRole) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret_note_vault_key', {
    expiresIn: '7d',
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, semester, expertise } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User identity already exists.' });
      return;
    }

    // Rule Signature Enforcement Match Matrix
    let assignedRole: UserRole = req.body.role || 'student';
    
    // FIXED: Updated admin detection criteria to target admin@glowcare.ai
    if (email.toLowerCase() === 'admin@notevault.com') {
      assignedRole = 'admin';
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      department,
      role: assignedRole,
      ...(assignedRole === 'student' && { semester }),
      ...(assignedRole === 'expert' && { expertise }),
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        ...(user.semester && { semester: user.semester }),
        ...(user.expertise && { expertise: user.expertise }),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal validation process failed.', error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    
    // FIXED: Added an explicit user.password check to act as a TypeScript type-guard.
    // This safely rejects standard login requests for passwordless OAuth (Google) users.
    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      res.json({
        token: generateToken(user._id.toString(), user.role),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          role: user.role,
          ...(user.semester && { semester: user.semester }),
          ...(user.expertise && { expertise: user.expertise }),
        },
      });
      return;
    }

    res.status(401).json({ message: 'Invalid server authentication credentials.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Authentication runtime error.', error: error.message });
  }
};