// routes/aiRoute.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

router.post('/study', async (req, res) => {
  console.log('✅ AI Route /api/ai/study HIT!', req.body.tool);

  try {
    const { tool, text, topic, depth, hours } = req.body;

    if (!tool) return res.status(400).json({ error: 'Tool is required' });

    let prompt = '';
    let system = '';

    switch (tool) {
      case 'summarizer':
        prompt = `Summarize the following text:\n\n${text || ''}`;
        system = `You are a study assistant. Return ONLY valid JSON (no markdown) with this exact shape:
{"headline":"one sentence that captures the main idea","keyPoints":["point 1","point 2","point 3","point 4","point 5"],"gaps":["knowledge gap 1","knowledge gap 2"]}`;
        break;

      case 'explainer':
        prompt = `Explain the topic: "${topic || ''}"`;
        system = `You are a study assistant. Return ONLY valid JSON (no markdown) with this exact shape:
{"simple":"one-paragraph plain-language explanation (3-4 sentences, no jargon)","deep":["detailed point 1","detailed point 2","detailed point 3","detailed point 4","detailed point 5"]}`;
        break;

      case 'quiz':
        prompt = `Generate a 5-question multiple choice quiz on: "${topic || ''}"`;
        system = `You are a study assistant. Return ONLY valid JSON (no markdown) — an array of exactly 5 objects:
[{"q":"question text","options":["A","B","C","D"],"correct":0}]`;
        break;

      case 'flashcards':
        prompt = `Create 8 flashcards from these notes:\n\n${text || ''}`;
        system = `You are a study assistant. Return ONLY valid JSON (no markdown) — an array of exactly 8 objects:
[{"front":"concise question or term","back":"clear answer or definition"}]`;
        break;

      case 'planner':
        prompt = `Create a study plan for: "${topic || ''}" in ${hours} hours.`;
        system = `You are a study assistant. Return ONLY valid JSON (no markdown) with this exact shape:
{"topic":"string","totalTime":"Xh Ym","blocks":[{"time":"HH:MM - HH:MM","task":"what to study","tip":"one practical tip"}]}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid tool' });
    }

    // In routes/aiRoute.ts
    const message = await anthropic.messages.create({
        // Use a string supported by your current API plan, 
        // as shown in the docs image you uploaded:
        model: 'claude-opus-4-8', 
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
    });

    let rawResponse = '';
    for (const block of message.content) {
      if (block.type === 'text') rawResponse += block.text;
    }

    const clean = rawResponse.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);

  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;