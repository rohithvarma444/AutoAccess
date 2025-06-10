const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

/**
 * HTTP Cloud Function to generate alt text from an image URL.
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.altText = async (req, res) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  res.set('Access-Control-Allow-Origin', '*'); // Allow CORS for all origins

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl' });
  }

  try {
    const [result] = await client.labelDetection(imageUrl);
    const labels = result.labelAnnotations || [];
    const altText = labels.map(label => label.description).join(', ');

    res.status(200).json({ altText });
  } catch (err) {
    console.error('Vision API Error:', err.message);
    res.status(500).json({ error: 'Vision API failed' });
  }
};