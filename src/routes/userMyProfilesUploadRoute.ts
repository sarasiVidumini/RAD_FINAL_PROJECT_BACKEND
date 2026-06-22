import express, { Request, Response } from 'express';
// Use curly braces for named exports
import { upload } from '../middleware/upload'; 
import { User } from '../models/user'; 

const router = express.Router();

router.put('/profile', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const updateData: any = { name, email };

    if (req.file) {
      updateData.avatarUrl = `/uploads/profiles/${req.file.filename}`;
    }

    // Access the user ID from the request (Ensure your auth middleware is placed before this route)
    const userId = (req as any).user?.id; 

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData, 
      { new: true }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

export default router;