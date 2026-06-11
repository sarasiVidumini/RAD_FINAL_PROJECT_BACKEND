import multer from 'multer';
import path from 'path';

// 1. Store files purely in RAM memory buffers instead of writing to local disk paths
const storage = multer.memoryStorage();

// 2. Validate file formats securely
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = /jpeg|jpg|png|pdf/;
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const isMimeTypeValid = allowedExtensions.test(file.mimetype);

  if (isExtensionValid && isMimeTypeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only PDF, JPG, JPEG, and PNG formats are allowed.'), false);
  }
};

// 3. Initialize the multer upload configuration instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // FIXED: Raised single file threshold capacity limit to 50MB
  limits: { fileSize: 50 * 1024 * 1024 } 
});

export default upload;