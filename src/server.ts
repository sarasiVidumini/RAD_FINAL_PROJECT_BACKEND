import dotenv from 'dotenv';
// CRITICAL: Configure environment variables before importing any internal routes or files!
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // Added for CSP configuration management
import path from 'path';     // Added to map filesystem paths cleanly
import connectDB from './config/db';

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

// Content Security Policy (CSP) Configuration to fix the browser loading block
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Whitelists local port 5000 so the frontend can display image attachments
        imgSrc: ["'self'", "data:", "https:", "http://localhost:5000"],
        // Whitelists network connection access pipelines
        connectSrc: ["'self'", "http://localhost:5000"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
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

// FIXED: Serve static assets straight from the project execution root folder
// This aligns identically with Multer creating and writing to 'uploads/'
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/experts', expertRoutes);


app.use('/api/chat', chatRoutes);
app.use('/api/chats', chatRoutes);

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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
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