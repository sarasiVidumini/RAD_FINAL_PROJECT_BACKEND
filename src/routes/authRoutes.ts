import { Router, Request, Response } from 'express';
import { register, login } from '../controller/authController';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

const router = Router();

// Traditional Auth Routes
router.post('/register', register);
router.post('/login', login);

// Secure Google Login Route with Client ID Verification
router.post('/google-login', async (req: Request, res: Response): Promise<any> => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Access token is missing" });
  }

  try {
    // 1. Verify token integrity and ensure it belongs to your Client ID
    const tokenInfoResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );

    const targetClientId = tokenInfoResponse.data.aud;

    // Security Check: Match against backend environment variable
    if (targetClientId !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "Token client ID mismatch. Security violation." });
    }

    // 2. Fetch user profile information using the verified token
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
      // Role Routing: Catch and escalate system administrator email
      let assignedRole: 'student' | 'expert' | 'admin' = 'student';
      if (email.toLowerCase() === 'admin@glowcare.ai') {
        assignedRole = 'admin';
      }

      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        role: assignedRole,
        googleId: googleId,
        department: 'General', 
        semester: assignedRole === 'student' ? 2 : undefined 
      });
    } else if (!user.googleId) {
      // Link Google ID if signing in via Google for the first time
      user.googleId = googleId;
      await user.save();
    }

    // 4. Generate application JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
      { expiresIn: '7d' }
    );

    // 5. Respond with frontend auth state payload match
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        department: user.department
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