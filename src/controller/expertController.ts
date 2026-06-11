import { Request, Response } from 'express';
import { User } from '../models/user';

/**
 * @desc    Get all users with the 'expert' role
 * @route   GET /api/experts
 * @access  Private (Any authenticated user)
 */
export const getAllExperts = async (req: Request, res: Response) => {
  try {
    // Find all users where role is 'expert' and exclude their passwords
    const experts = await User.find({ role: 'expert' }).select('-password');
    return res.status(200).json(experts);
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Failed to retrieve experts directory', 
      error: error.message 
    });
  }
};

/**
 * @desc    Update an expert's profile details
 * @route   PUT /api/experts/:id
 * @access  Private/Admin Only
 */
export const updateExpert = async (req: Request, res: Response) => {
  try {
    const { name, department, expertise } = req.body;

    // Verify if target user exists and is actually an expert before modifying
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Expert profile target not found' });
    }
    
    if (targetUser.role !== 'expert') {
      return res.status(400).json({ message: 'Selected user is not registered under an expert role' });
    }

    // Apply the updates safely
    const updatedExpert = await User.findByIdAndUpdate(
      req.params.id,
      { name, department, expertise },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({ 
      message: 'Expert profile updated successfully', 
      expert: updatedExpert 
    });
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Failed to modify expert profile records', 
      error: error.message 
    });
  }
};

/**
 * @desc    Permanently delete/revoke an expert account
 * @route   DELETE /api/experts/:id
 * @access  Private/Admin Only
 */
export const deleteExpert = async (req: Request, res: Response) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Expert account target not found' });
    }

    if (targetUser.role !== 'expert') {
      return res.status(400).json({ message: 'Target user account is not an expert' });
    }

    // Delete the expert completely from your collection
    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({ 
      message: 'Expert account permanently revoked and deleted from the system core' 
    });
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Failed to drop expert credentials', 
      error: error.message 
    });
  }
};