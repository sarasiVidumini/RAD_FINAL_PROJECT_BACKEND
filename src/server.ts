import dotenv from 'dotenv';
// CRITICAL: Configure environment variables before importing any internal routes or files!
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';

// Import Routes
import authRoutes from './routes/authRoutes';
import noteRoutes from './routes/noteRoutes';
import requestRoutes from './routes/requestRoute';
import expertRoutes from './routes/expertRoutes';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Explicitly whitelist frontend development origins
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type']
}));

// Increased body parser limits to accommodate larger base64 file buffers safely
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/experts', expertRoutes);

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