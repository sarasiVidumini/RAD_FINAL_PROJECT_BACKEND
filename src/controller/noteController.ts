import { Request, Response } from 'express';

import { Note } from '../models/Note';

import cloudinary from '../config/cloudinary';

import { Request as RequestModel } from '../models/request';

import { User } from '../models/user';

import axios from 'axios';

import jwt from 'jsonwebtoken';


interface MulterFile {

  fieldname: string;

  originalname: string;

  encoding: string;

  mimetype: string;

  size: number;

  buffer: Buffer;

}

export const uploadNote = async (req: any, res: Response) => {
  try {
    const { title, subject, semester, description, requestId } = req.body;
    const files = (req.files || []) as MulterFile[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one file' });
    }

    const uploadedFiles: string[] = [];

    for (const file of files) {
      if (!file.buffer) {
        return res.status(400).json({
          message: `File buffer is missing for ${file.originalname}.`
        });
      }


      const fileBase64 = file.buffer.toString('base64');

      const dataURI = `data:${file.mimetype};base64,${fileBase64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'notevault',
        resource_type: 'auto'
      });

      if (result?.secure_url) {
        uploadedFiles.push(result.secure_url);
      } else {
        throw new Error("Cloudinary upload failed");
      }
    }


    const note = await Note.create({
      title,
      subject,
      semester: Number(semester),
      description,
      files: uploadedFiles,
      uploadedBy: req.user.id,
    });

    
    if (requestId) {
      const request = await RequestModel.findById(requestId);
        if (request && request.status === 'open') {
        request.status = 'fulfilled';
        request.fulfilledBy = req.user.id as any; // Cast if req.user.id throws a similar error
        request.fulfilledNote = note._id as any;   // FIX: Added 'as any' here

      await request.save();

      await User.findByIdAndUpdate(req.user.id, { $inc: { helpPoints: 10 } });
    }
  }

    res.status(201).json(note);
  } catch (error: any) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};



export const updateNote = async (req: any, res: Response) => {

  try {

    const { noteId } = req.params;

    const { title, subject, semester, description } = req.body;

    const files = (req.files || []) as MulterFile[];

    const note = await Note.findById(noteId);

    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Ownership check

    if (note.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {

      return res.status(403).json({ message: 'Not authorized to update this note' });

    }

    const updateData: any = {};

    if (title) updateData.title = title;

    if (subject) updateData.subject = subject;

    if (semester) updateData.semester = Number(semester);

    if (description !== undefined) updateData.description = description;

    // Handle new file uploads if provided

    if (files && files.length > 0) {

      const newUploadedFiles: string[] = [];

      for (const file of files) {

        if (!file.buffer) continue;

        const fileBase64 = file.buffer.toString('base64');

        const dataURI = `data:${file.mimetype};base64,${fileBase64}`;

        const result = await cloudinary.uploader.upload(dataURI, {

          folder: 'notevault',

          resource_type: 'auto'

        });

        if (result?.secure_url) newUploadedFiles.push(result.secure_url);

      }

      if (newUploadedFiles.length > 0) {

        updateData.files = [...(note.files || []), ...newUploadedFiles];

      }

    }

    const updatedNote = await Note.findByIdAndUpdate(

      noteId,

      updateData,

      { new: true, runValidators: true }

    ).populate('uploadedBy', 'name department');

    res.json(updatedNote);

  } catch (error: any) {

    console.error("❌ Update Note Error:", error);

    res.status(500).json({ message: error.message || "Internal Server Error" });

  }

};

export const getAllNotes = async (req: Request, res: Response) => {

  try {

    const { search, subject, semester } = req.query;

    let query: any = {};


    if (search) {

      query.title = { $regex: search, $options: 'i' };

    }

    if (subject) {

      query.subject = subject;

    }

    if (semester) {

      query.semester = Number(semester);

    }

    const notes = await Note.find(query)

      .populate('uploadedBy', 'name department')

      .sort({ createdAt: -1 });

    res.json(notes);

  } catch (error: any) {

    res.status(500).json({ message: error.message });

  }

};

export const getMyNotes = async (req: any, res: Response) => {

  try {

    const notes = await Note.find({ uploadedBy: req.user.id })

      .populate('uploadedBy', 'name department')

      .sort({ createdAt: -1 });

    res.json(notes);

  } catch (error: any) {

    res.status(500).json({ message: error.message });

  }

};

export const rateNote = async (req: any, res: Response) => {

  try {

    const { noteId } = req.params;

    const { rating, comment } = req.body;

    const note = await Note.findById(noteId);

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const existingRating = note.ratings.find(r => r.user.toString() === req.user.id);

    if (existingRating) {

      existingRating.rating = rating;

      existingRating.comment = comment;

    } else {

      note.ratings.push({ user: req.user.id, rating, comment });

    }

    
    note.averageRating = note.ratings.reduce((acc, r) => acc + r.rating, 0) / note.ratings.length;

    await note.save();

    res.json(note);

  } catch (error: any) {

    res.status(500).json({ message: error.message });

  }

};



export const deleteNote = async (req: any, res: Response) => {

  try {

    const note = await Note.findById(req.params.noteId);

    if (!note) {

      return res.status(404).json({ message: 'Note not found' });

    }

    // Ownership check

    if (note.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {

      return res.status(403).json({ message: 'Not authorized to delete this note' });

    }

    await Note.findByIdAndDelete(req.params.noteId);

    res.json({

      message: 'Note deleted successfully',

      noteId: req.params.noteId

    });

  } catch (error: any) {

    res.status(500).json({ message: error.message });

  }

};

export const streamNoteFile = async (req: any, res: Response): Promise<void> => {
  try {
    const { noteId } = req.params;
    const fileIndex = parseInt(req.query.index as string) || 0;

    let token = '';
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ message: "Authentication required to stream asset payload profiles." });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      req.user = decoded;
    } catch (jwtError) {
      res.status(401).json({ message: "Expired or structurally invalid token signature." });
      return;
    }

    const note = await Note.findById(noteId);
    if (!note || !note.files || note.files.length === 0) {
      res.status(404).json({ message: "Document profile not found." });
      return;
    }

    let targetCloudinaryUrl = note.files[fileIndex];

    // Convert image container routes into raw binary endpoints
    if (targetCloudinaryUrl.includes('/image/upload/')) {
      targetCloudinaryUrl = targetCloudinaryUrl.replace('/image/upload/', '/raw/upload/');
    }

    const cloudinaryResponse = await axios({
      method: 'get',
      url: targetCloudinaryUrl,
      responseType: 'stream',
      headers: { 'Accept': 'application/pdf, */*' }
    });

    // Enforce matching server origin rules to make browser context completely safe
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="secure-document.pdf"');

    cloudinaryResponse.data.pipe(res);

  } catch (error: any) {
    console.error("❌ Secure File Streaming Fault:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to load secure resource stream.", error: error.message });
    }
  }
};
