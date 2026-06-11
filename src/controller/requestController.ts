import { Request, Response } from 'express';
import { Request as RequestModel } from '../models/request';
import { Note } from '../models/Note';
import { User } from '../models/user';

export const createRequest = async (req: any, res: Response) => {
  try {
    const { title, subject, semester, description } = req.body;

    const request = await RequestModel.create({
      title,
      subject,
      semester: Number(semester),
      description,
      requestedBy: req.user.id,
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let query: any = status ? { status } : { status: 'open' };

    const requests = await RequestModel.find(query)
      .populate('requestedBy', 'name department')
      .populate('fulfilledBy', 'name')
      .populate('fulfilledNote')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const fulfillRequest = async (req: any, res: Response) => {
  try {
    const { requestId, noteId } = req.body;

    const request = await RequestModel.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const note = await Note.findById(noteId);
    if (!note) return res.status(404).json({ message: "Note not found" });

    request.status = 'fulfilled';
    request.fulfilledBy = req.user.id;
    request.fulfilledNote = noteId;
    await request.save();

    // Reward expert
    await User.findByIdAndUpdate(req.user.id, { $inc: { helpPoints: 10 } });

    res.json({ message: "Request fulfilled successfully!", request });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsFulfilled = async (req: any, res: Response) => {
  try {
    const { requestId, helpPoints = 10 } = req.body;
    const request = await RequestModel.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = 'fulfilled';
    request.helpPoints = helpPoints;
    await request.save();

    res.json({ message: "Request marked as fulfilled. Thank you!" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};