import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string(),
  semester: z.number().min(1).max(8),
  role: z.enum(['student', 'admin']).optional().default('student'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});