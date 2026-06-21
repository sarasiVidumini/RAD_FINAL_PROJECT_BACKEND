import dotenv from 'dotenv';
// CRITICAL: Configure environment variables before importing any internal routes or files!
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // Added for CSP configuration management
import path from 'path';     // Added to map filesystem paths cleanly
import connectDB from './config/db';
import bcrypt from 'bcryptjs'; // Required to safely secure your admin password
import { User } from './models/user'; // Required to query/write to the user database collections

// Import Routes
import authRoutes from './routes/authRoutes';
import noteRoutes from './routes/noteRoutes';
import requestRoutes from './routes/requestRoute';
import expertRoutes from './routes/expertRoutes';
import chatRoutes from './routes/chatRoutes';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Explicitly whitelist frontend development origins
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type']
}));

// Content Security Policy (CSP) Configuration updated for Google OAuth compatibility
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Whitelists local port 5000 so the frontend can display image attachments
        imgSrc: ["'self'", "data:", "https:", "http://localhost:5000"],
        // Whitelists network connection access pipelines including Google's Identity endpoints
        connectSrc: ["'self'", "http://localhost:5000", "https://accounts.google.com/", "https://oauth2.googleapis.com/"],
        // Whitelists local execution scripts and the Google Identity Services client script
        scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://accounts.google.com/gsi/client"],
        // Whitelists the iframe context wrapper required by the Google Sign-In prompt overlay
        frameSrc: ["'self'", "https://accounts.google.com/"],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    // Allows cross-origin requests for resources (like displaying your uploaded files)
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Increased body parser limits to accommodate larger base64 file buffers safely
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets straight from the project execution root folder
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// API Routes Base Configuration Maps
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/requests', requestRoutes);

app.use('/api/experts', expertRoutes);


app.use('/api/chat', chatRoutes);
app.use('/api/chats', chatRoutes);

/**
 * ========================================================
 * SECURE USER ACCOUNTS MANAGEMENT & ADMIN DATA ENDPOINTS
 * ========================================================
 * This resolves the frontend 404 errors by establishing
 * structural endpoints for user arrays queries and operations.
 */

// Route 1: Get all registered user profiles directory matrix (Addresses GET /api/users)
app.get('/api/users', async (req, res) => {
  try {
    // Exclude the securely hashed password string configurations from returning over clear text pipelines
    const userProfiles = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json(userProfiles);
  } catch (error) {
    console.error('Error fetching all user profiles:', error);
    res.status(500).json({ message: 'Error retrieving user system directories', error });
  }
});

// Route 2: Terminate/Wipe an explicitly specified user profile identity account (Addresses DELETE /api/users/:id)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Requested user entity profile context not found" });
    }

    // Safety lock restriction mapping protection mechanisms
    const emailMatch = targetUser.email.toLowerCase();
    if (emailMatch === 'admin@notevault.com' || emailMatch === 'admin@glowcare.ai' || targetUser.role === 'admin') {
      return res.status(403).json({ message: "Security Guard Restriction: Core system administrators cannot be removed." });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "Identity records detached and user purged successfully" });
  } catch (error) {
    console.error('Failure executing user records purge sequence:', error);
    res.status(500).json({ message: 'Error terminating data node profile', error });
  }
});

// Endpoint to fetch total number of registered students
app.get('/api/users/count-students', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'student' });
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching student count:', error);
    res.status(500).json({ message: 'Error counting students', error });
  }
});

// Endpoint to fetch total number of registered verified experts
app.get('/api/users/count-experts', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'expert' });
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching expert count:', error);
    res.status(500).json({ message: 'Error counting experts', error });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send(`
    <h1>✅ NoteVault Backend is Running Successfully!</h1>
    <p><strong>API is working at:</strong> http://localhost:5000/api</p>
    <br>
    <p>Available Routes:</p>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
      <li><a href="/api/notes">/api/notes</a></li>
      <li><a href="/api/users">/api/users</a></li>
      <li><a href="/api/users/count-students">/api/users/count-students</a></li>
      <li><a href="/api/users/count-experts">/api/users/count-experts</a></li>
    </ul>
  `);
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'NoteVault Backend is running smoothly!' 
  });
});

// Automated Function to check and provision your specific admin credentials
const autoSeedAdminUser = async () => {
  const ADMIN_EMAIL = 'admin@notevault.com';
  const ADMIN_PLAINTEXT_PASSWORD = 'admin@123';

  try {
    // Check if the admin account with this email exists
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('🛡️  System Configuration Status: Admin credentials verified in database.');
      return;
    }

    // Hash your requested 'admin@123' password before writing to the database
    const salt = await bcrypt.genSalt(10);
    const securelyHashedPassword = await bcrypt.hash(ADMIN_PLAINTEXT_PASSWORD, salt);

    // Create the system super administrator identity account mapping records
    await User.create({
      name: 'System Super Admin',
      email: ADMIN_EMAIL,
      password: securelyHashedPassword,
      role: 'admin',
      department: 'Management'
    });

    console.log('🚀 SYSTEM SEED SUCCESSFUL: Admin account auto-provisioned!');
    console.log(`📌 Username: ${ADMIN_EMAIL} | Password: ${ADMIN_PLAINTEXT_PASSWORD}`);
  } catch (error) {
    console.error('❌ Automation engine failed to check/provision admin account:', error);
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB instance safely
    await connectDB();
    
    // 2. Automatically verify/seed your target administrator credentials
    await autoSeedAdminUser();
    
    // 3. Bind networking port allocations
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 NoteVault Backend is ready!`);
      console.log(`📌 Request System Active!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();