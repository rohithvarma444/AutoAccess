const { GoogleGenAI } = require('@google/genai');
const functions = require('@google-cloud/functions-framework');

// Initialize Gemini client
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'autoacess',
  location: 'us-central1',
});

functions.http('summarisePage', async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  res.set('Access-Control-Allow-Origin', '*'); // Allow all origins

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Text content is required in the request body' });
    }

    const prompt = `You are helping a blind user understand the website content. Summarize the following text by explaining the key points in a clear and simple way:\n\n${text}`;

    const responseAI = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    res.status(200).json({ summary: responseAI.text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});