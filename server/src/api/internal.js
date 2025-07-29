const express = require('express');
const Article = require('../models/Article');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const Tesseract = require('tesseract.js');
const youtubeTranscript = require('youtube-transcript').default;
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const { getWorker } = require('../../../tesseractWorker');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const uploadDir = path.join(__dirname, '../../uploads');
fs.ensureDirSync(uploadDir);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [ new winston.transports.Console() ]
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only PDF, JPG, JPEG, PNG allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

const API_SENTIMENT_URL = process.env.SENTIMENT_API_URL || 'http://localhost:5000/api/v1/analyze-sentiment';
const API_FAKE_NEWS_URL = process.env.FAKE_NEWS_API_URL || 'http://localhost:3001/detect-fake-news';

const router = express.Router();

// POST /internal/process-sentiment
router.post('/internal/process-sentiment', async (req, res) => {
  try {
    const articles = await Article.find({ $or: [ { sentimentScore: { $exists: false } }, { sentimentLabel: { $exists: false } } ] });
    let updated = 0;
    for (const article of articles) {
      const text = article.description || article.content || article.title || '';
      try {
        // --- ML Fake News Detection ---
        try {
          const fakeRes = await axios.post(API_FAKE_NEWS_URL, { text });
          if (fakeRes.data) {
            article.isFake = fakeRes.data.label === 1;
            article.fakeProbability = fakeRes.data.probability;
            article.classificationTimestamp = new Date();
          }
        } catch (err) {
          logger.error('Fake News ML service error', { error: err.response?.data || err.message });
        }
        const sentimentRes = await axios.post(API_SENTIMENT_URL, { text });
        const sentiment = sentimentRes.data.sentiment;
        if (sentiment) {
          article.sentimentScore = sentiment.score;
          article.sentimentLabel = sentiment.label;
          await article.save();
          updated++;
        }
      } catch (err) {
        logger.error('Sentiment ML service error', { error: err.response?.data || err.message });
      }
    }
    res.json({ updated });
  } catch (err) {
    logger.error('Failed to process sentiment for articles', { error: err.message });
    res.status(500).json({ error: 'Failed to process sentiment for articles' });
  }
});

// Helper: Robust YouTube ID extraction
function extractYouTubeId(link) {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return url.searchParams.get('v');
    } else if (host === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch {}
  // Fallback regex
  const match = link.match(/(?:v=|youtu\.be\/|v=)([\w-]{11})/);
  return match ? match[1] : null;
}

// Helper: Manual timeout for async tasks
function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

// Helper: Extract text from HTML using Readability, fallback to cheerio
function extractTextFromHtml(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.textContent && article.textContent.trim().length > 100) {
      return article.textContent;
    }
    // Fallback: Use cheerio to get all p, h1, h2, h3 text
    const $ = cheerio.load(html);
    let text = '';
    $('h1, h2, h3, p').each((_, el) => {
      text += $(el).text() + '\n';
    });
    return text;
  } catch (err) {
    return '';
  }
}

// Main endpoint
router.use('/check-fake-status', limiter);
router.post('/check-fake-status', upload.single('file'), async (req, res) => {
  let extractedText = '';
  let type = '';
  let warning = undefined;
  let tempFilePath = null;
  try {
    if (req.file) {
      tempFilePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const mimetype = req.file.mimetype;
      if (mimetype === 'application/pdf') {
        type = 'pdf';
        const data = await fs.readFile(tempFilePath);
        extractedText = (await pdfParse(data)).text;
      } else if (mimetype === 'text/plain') {
        type = 'txt';
        extractedText = await fs.readFile(tempFilePath, 'utf8');
      } else if (mimetype.startsWith('image/')) {
        type = 'image';
        const worker = await getWorker();
        extractedText = await withTimeout(
          worker.recognize(tempFilePath),
          30000,
          'OCR timed out.'
        ).then(res => res.data.text);
      } else {
        throw new Error('Unsupported file type.');
      }
      if (!extractedText || !extractedText.trim()) throw new Error('No text found in file.');
      if (req.body.link) warning = 'File was processed; link was ignored.';
    } else {
      const { link } = req.body;
      if (!link) throw new Error('No file or link provided.');
      let url;
      try {
        url = new URL(link);
      } catch {
        throw new Error('Invalid URL format.');
      }
      const lowerLink = link.toLowerCase();
      const videoId = extractYouTubeId(link);
      if (videoId) {
        type = 'youtube';
        const transcript = await youtubeTranscript.fetchTranscript(videoId);
        extractedText = transcript.map(t => t.text).join(' ');
      } else if (['.jpg', '.jpeg', '.png'].some(ext => lowerLink.endsWith(ext))) {
        type = 'image';
        const resp = await axios.get(link, { responseType: 'arraybuffer', timeout: 10000 });
        const tempImgPath = path.join(uploadDir, Date.now() + '-img' + path.extname(link));
        await fs.writeFile(tempImgPath, resp.data);
        const worker = await getWorker();
        extractedText = await withTimeout(
          worker.recognize(tempImgPath),
          30000,
          'OCR timed out.'
        ).then(res => res.data.text);
        await fs.remove(tempImgPath);
      } else if (lowerLink.endsWith('.pdf')) {
        type = 'pdf';
        const resp = await axios.get(link, { responseType: 'arraybuffer', timeout: 10000 });
        const tempPdfPath = path.join(uploadDir, Date.now() + '-pdf.pdf');
        await fs.writeFile(tempPdfPath, resp.data);
        const data = await pdfParse(await fs.readFile(tempPdfPath));
        extractedText = data.text;
        await fs.remove(tempPdfPath);
      } else {
        type = 'webpage';
        const resp = await axios.get(link, { timeout: 10000 });
        extractedText = extractTextFromHtml(resp.data, link);
      }
      if (!extractedText || !extractedText.trim()) throw new Error('No text could be extracted from the provided link.');
    }
    let sentiment = null;
    let fakeNews = null;
    try {
      const sentimentRes = await axios.post(API_SENTIMENT_URL, { text: extractedText });
      sentiment = sentimentRes.data.sentiment || null;
    } catch (err) {
      logger.error('Sentiment analysis failed', { error: err.response?.data?.error || err.message });
      sentiment = { error: err.response?.data?.error || err.message || 'Sentiment analysis failed.' };
    }
    try {
      const fakeRes = await axios.post(API_FAKE_NEWS_URL, { text: extractedText });
      fakeNews = fakeRes.data || null;
    } catch (err) {
      logger.error('Fake news detection failed', { error: err.response?.data?.error || err.message });
      fakeNews = { error: err.response?.data?.error || err.message || 'Fake news detection failed.' };
    }
    return res.json({
      valid: true,
      type,
      extractedText,
      sentiment,
      fakeNews,
      warning,
    });
  } catch (err) {
    logger.error('Check fake status error', { error: err.message });
    return res.status(400).json({ error: err.message || 'Failed to process input.' });
  } finally {
    if (tempFilePath) {
      await fs.remove(tempFilePath);
      logger.info('Temp file cleaned up', { file: tempFilePath });
    }
  }
});

// Alias route for legacy support
router.post('/check-fake-status', upload.single('file'), async (req, res, next) => {
  // Call the main handler
  req.url = '/internal/check-fake-status';
  next();
});

module.exports = router; 