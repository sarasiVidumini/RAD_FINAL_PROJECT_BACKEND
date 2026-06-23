import dotenv from "dotenv";
// CRITICAL: Configure environment variables before importing any internal routes or files!
dotenv.config();

import express from "express";
import http from "http"; // Added for Native HTTP wrappers
import { Server } from "socket.io"; // Added for Socket.io runtime execution
import cors from "cors";
import helmet from "helmet";
import path from "path";
import connectDB from "./config/db";
import bcrypt from "bcryptjs";
import { User } from "./models/user";

// Import Real-time Socket Controller Handler
import { initializeGroupChatSockets } from "./controller/groupChatController";

// Import Routes
import authRoutes from "./routes/authRoutes";
import noteRoutes from "./routes/noteRoutes";
import requestRoutes from "./routes/requestRoute";
import expertRoutes from "./routes/expertRoutes";
import chatRoutes from "./routes/chatRoutes";
import aiRoutes from "./routes/aiRoute";
import userMyProfilesUploadRoute from "./routes/userMyProfilesUploadRoute";

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",")
  : ["http://localhost:5173", "http://localhost:4173"];
const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
const wsBackendUrl = process.env.WS_BACKEND_URL || "ws://localhost:5000";

// Middlewares
app.use(
  cors({
    origin: allowedOrigins, // Explicitly whitelist frontend origins
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

// Content Security Policy (CSP) Configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        imgSrc: ["'self'", "data:", "https:", backendUrl],

        // ADDED: https://api.anthropic.com to allow proxying
        connectSrc: [
          "'self'",
          backendUrl,
          wsBackendUrl,
          "https://accounts.google.com/",
          "https://oauth2.googleapis.com/",
          "https://api.anthropic.com",
        ],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "blob:",
          "https://accounts.google.com/gsi/client",
        ],

        frameSrc: ["'self'", "https://accounts.google.com/"],

        workerSrc: ["'self'", "blob:"],

        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },

    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Increased body parser limits to accommodate larger base64 file buffers safely
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static assets straight from the project execution root folder
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// In your backend server.ts
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes Base Configuration Maps
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.use("/api/requests", requestRoutes);

app.use("/api/experts", expertRoutes);

app.use("/api/chat", chatRoutes);
app.use("/api/chats", chatRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/user", userMyProfilesUploadRoute);

/**
 * ========================================================
 * SECURE USER ACCOUNTS MANAGEMENT & ADMIN DATA ENDPOINTS
 * ========================================================

*/

app.get("/api/users", async (req, res) => {
  try {
    const userProfiles = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json(userProfiles);
  } catch (error) {
    console.error("Error fetching all user profiles:", error);
    res
      .status(500)
      .json({ message: "Error retrieving user system directories", error });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res
        .status(404)
        .json({ message: "Requested user entity profile context not found" });
    }

    const emailMatch = targetUser.email.toLowerCase();
    if (
      emailMatch === "admin@notevault.com" ||
      emailMatch === "admin@glowcare.ai" ||
      targetUser.role === "admin"
    ) {
      return res
        .status(403)
        .json({
          message:
            "Security Guard Restriction: Core system administrators cannot be removed.",
        });
    }

    await User.findByIdAndDelete(id);
    res
      .status(200)
      .json({
        message: "Identity records detached and user purged successfully",
      });
  } catch (error) {
    console.error("Failure executing user records purge sequence:", error);
    res
      .status(500)
      .json({ message: "Error terminating data node profile", error });
  }
});

app.get("/api/users/count-students", async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "student" });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error counting students", error });
  }
});

app.get("/api/users/count-experts", async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "expert" });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error counting experts", error });
  }
});

app.get("/", (req, res) => {
  res.send(`<h1>✅ NoteVault Backend is Running Successfully!</h1>`);
});

const autoSeedAdminUser = async () => {
  const ADMIN_EMAIL = "admin@notevault.com";
  const ADMIN_PLAINTEXT_PASSWORD = "admin@123";

  try {
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    if (adminExists) return;

    const salt = await bcrypt.genSalt(10);
    const securelyHashedPassword = await bcrypt.hash(
      ADMIN_PLAINTEXT_PASSWORD,
      salt,
    );

    await User.create({
      name: "System Super Admin",
      email: ADMIN_EMAIL,
      password: securelyHashedPassword,
      role: "admin",
      department: "Management",
    });

    console.log("🚀 SYSTEM SEED SUCCESSFUL: Admin account auto-provisioned!");
  } catch (error) {
    console.error("❌ Automation engine failed to seed admin account:", error);
  }
};

// ========================================================
// INITIALIZE COMPOSITE REAL-TIME NETWORKING INTERFACES
// ========================================================

// 1. Wrap the Express instance inside a native Node HTTP infrastructure layer
const server = http.createServer(app);

// 2. Initialize Socket.io instance and connect it to the HTTP server wrapper
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 3. Mount real-time message exchange controllers
initializeGroupChatSockets(io);

const startServer = async () => {
  try {
    await connectDB();

    await autoSeedAdminUser();

    // CRITICAL FIX: Listen via the 'server' instance wrapper so WebSockets are active!
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 NoteVault Real-Time Chat Engine Ready!`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
