import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Fallback safety checkpoint to ensure keys load even if file initialization paths drift
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export default cloudinary;