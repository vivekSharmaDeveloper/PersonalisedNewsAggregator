const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');
const LogisticRegression = require('ml-logistic-regression');
const { Matrix } = require('ml-matrix');

// Paths to model and vectorizer assets
const DATA_DIR = path.resolve(__dirname, '../ml_data/fake_news/processed');
const MODEL_PATH = path.join(DATA_DIR, 'logistic_regression_model.json');
const TFIDF_STATE_PATH = path.join(DATA_DIR, 'tfidf_state.json');
const VOCAB_PATH = path.join(DATA_DIR, 'vocabulary.json');

// Preprocessing tools (instantiate once)
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const stopwords = new Set(require('natural/lib/natural/util/stopwords').words);

// Global variables for loaded assets
let classifier = null; // LogisticRegression instance
let tfidfInstance = null; // natural.TfIdf instance
let vocabularyList = null; // Array of vocabulary terms

// Preprocessing function (matches training pipeline)
function preprocessText(text) {
  // Lowercase, remove non-alpha, tokenize, remove stopwords, stem
  let tokens = tokenizer.tokenize(text.toLowerCase().replace(/[^a-z\s]/g, ' '));
  tokens = tokens.filter(t => t && !stopwords.has(t));
  tokens = tokens.map(t => stemmer.stem(t));
  return tokens.join(' ');
}

// Load all assets async before starting server
async function loadAssets() {
  try {
    const [modelRaw, tfidfStateRaw, vocabRaw] = await Promise.all([
      fs.readFile(MODEL_PATH, 'utf8'),
      fs.readFile(TFIDF_STATE_PATH, 'utf8'),
      fs.readFile(VOCAB_PATH, 'utf8')
    ]);
    const modelJSON = JSON.parse(modelRaw);
    const tfidfState = JSON.parse(tfidfStateRaw);
    const vocabArray = JSON.parse(vocabRaw);
    classifier = LogisticRegression.load(modelJSON);
    // Re-instantiate the TF-IDF vectorizer
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    // Use the correct key for saved documents
    const docs = tfidfState.savedDocuments || tfidfState.documents;
    if (Array.isArray(docs)) {
      docs.forEach(doc => tfidf.documents.push(doc));
    } else {
      throw new Error('No saved documents found in tfidf_state.json');
    }
    tfidfInstance = tfidf;
    vocabularyList = vocabArray;
  } catch (err) {
    console.error('Error loading model/vectorizer assets:', err);
    process.exit(1);
  }
}

async function main() {
  await loadAssets();
  const app = express();
  app.use(bodyParser.json());
  app.use(cors()); // Enable CORS for all origins

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.post('/detect-fake-news', (req, res) => {
    if (!classifier || !tfidfInstance || !vocabularyList) {
      return res.status(500).json({ error: 'ML models not loaded. Server is not ready.' });
    }
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid text field.' });
      }
      // Preprocess
      const processed = preprocessText(text);
      // Vectorize: use tfidf.tfidfs to get the tf-idf vector for the new document
      let vector = Array(vocabularyList.length).fill(0);
      tfidfInstance.tfidfs(processed, (i, measure, key, matrix) => {
        const idx = vocabularyList.indexOf(key);
        if (idx !== -1) {
          vector[idx] = measure;
        }
      });
      // Predict
      const prob = classifier.predict(new Matrix([vector]))[0];
      const label = prob >= 0.5 ? 1 : 0;
      res.json({ label, probability: prob });
    } catch (err) {
      console.error('Prediction error:', err);
      res.status(500).json({ error: 'Prediction failed.' });
    }
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`ML inference microservice running on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Failed to start ML inference microservice:', err);
}); 