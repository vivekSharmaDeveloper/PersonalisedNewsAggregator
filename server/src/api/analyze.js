const express = require('express');
const { analyzeSentiment } = require('../utils/sentiment');
const { validate } = require('../middlewares/validation');
const { sentimentAnalysisSchema } = require('../validators/schemas');

const router = express.Router();

// POST /api/v1/analyze-sentiment
router.post('/analyze-sentiment', validate(sentimentAnalysisSchema), async (req, res) => {
  try {
    const { text } = req.body;
    const sentiment = await analyzeSentiment(text);
    
    if (!sentiment) {
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to analyze sentiment',
        error: 'Sentiment analysis service unavailable'
      });
    }
    
    res.json({ 
      status: 'success',
      sentiment 
    });
  } catch (err) {
    console.error('Failed to analyze sentiment:', err, err?.message, err?.stack);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to analyze sentiment',
      error: err.message
    });
  }
});

module.exports = router; 