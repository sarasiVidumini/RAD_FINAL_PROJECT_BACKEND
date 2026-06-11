import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'student' | 'expert' | 'admin';
  };
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_note_vault_key') as { id: string; role: any };
      
      req.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (error) {
      res.status(401).json({ message: 'Authentication verification rejected. Invalid signature token.' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Authorization aborted. Missing credentials header.' });
    return;
  }
};

export const authorizeRoles = (...allowedRoles: ('student' | 'expert' | 'admin')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `Forbidden: Access restricted. Role [${req.user?.role || 'Guest'}] is unauthorized.` 
      });
      return;
    }
    next();
  };
};