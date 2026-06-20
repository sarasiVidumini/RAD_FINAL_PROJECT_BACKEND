import { Router, Request, Response } from 'express';
import { register, login } from '../controller/authController';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

const router = Router();

// Traditional Auth Routes
router.post('/register', register);
router.post('/login', login);

// Secure Google Login Route with Mismatch Proof Sanitization
router.post('/google-login', async (req: Request, res: Response): Promise<any> => {
  const { accessToken, role, department, semester, expertise } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Access token is missing" });
  }

  try {
    // 1. Verify token integrity via Google Network API
    const tokenInfoResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );

    const targetClientId = tokenInfoResponse.data.aud;
    const authorizedParty = tokenInfoResponse.data.azp; // Fallback container used by Google Identity implicitly

    // Sanitize values to eliminate hidden quotes or extra white spaces from .env files
    const cleanEnvClientId = (process.env.GOOGLE_CLIENT_ID || '').replace(/^["']|["']$/g, '').trim();
    const cleanTargetClientId = (targetClientId || '').trim();
    const cleanAuthorizedParty = (authorizedParty || '').trim();

    // Strict Security Match Check matching both potential payload positions
    if (cleanTargetClientId !== cleanEnvClientId && cleanAuthorizedParty !== cleanEnvClientId) {
      console.error("❌ OAUTH VALIDATION MISMATCH:");
      console.error(`- Received 'aud' Key from Token: "${cleanTargetClientId}"`);
      console.error(`- Received 'azp' Key from Token: "${cleanAuthorizedParty}"`);
      console.error(`- Expected Backend Env ID:      "${cleanEnvClientId}"`);
      return res.status(401).json({ message: "Token client ID mismatch. Security violation." });
    }

    // 2. Fetch user profile data using the verified token
    const googleResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    );

    const { email, name, sub: googleId } = googleResponse.data;

    if (!email) {
      return res.status(400).json({ message: "Unable to retrieve email from Google Account" });
    }

    // 3. Find or provision the user account
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Role Routing Validation Engine
      let assignedRole: 'student' | 'expert' | 'admin' = role || 'student';
      
      if (email.toLowerCase() === 'admin@glowcare.ai') {
        assignedRole = 'admin';
      }

      // Provision user account mapping metadata submitted from frontend form
      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        role: assignedRole,
        googleId: googleId,
        department: department || 'General', 
        semester: assignedRole === 'student' ? (semester || 1) : undefined,
        expertise: assignedRole === 'expert' ? expertise : undefined
      });
    } else if (!user.googleId) {
      // Link Google Account identity key permanently if email matches
      user.googleId = googleId;
      await user.save();
    }

    // 4. Generate application access token (JWT)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'note_vault_fallback_secure_key_2026',
      { expiresIn: '7d' }
    );

    // 5. Send optimized payload structure back to frontend
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        department: user.department,
        expertise: user.expertise
      }
    });

  } catch (error: any) {
    console.error("Google Secure Auth Failure:", error.response?.data || error.message);
    return res.status(401).json({ 
      message: "Authentication handshake processing failed with external Identity services" 
    });
  }
});

export default router;