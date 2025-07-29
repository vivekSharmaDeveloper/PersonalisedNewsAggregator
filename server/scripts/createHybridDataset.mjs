import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { MongoClient } from 'mongodb';
import natural from 'natural';
const stopwords = natural.stopwords;
const tokenizer = new natural.WordTokenizer();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
// Use project-wide convention for data directories
const CSV_DIR = path.join(__dirname, '../../ml_data/fake_news/raw_external_datasets/');
const OUTPUT_DIR = path.join(__dirname, '../../ml_data/fake_news/processed/');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/News Aggregator';
const MONGO_DB = 'News Aggregator';
const MONGO_COLLECTION = 'articles';

// --- Label Constants ---
const REAL_LABEL = 0;
const FAKE_LABEL = 1;
const LIAR_DIR = path.join(__dirname, '../datasets/archive');
const LIAR_FILES = ['train.tsv', 'valid.tsv', 'test.tsv'];

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

function loadAndProcessCsv(filePath, label) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        let text = '';
        if (row.text) text = row.text;
        else if (row.article_content) text = row.article_content;
        else if (row.content) text = row.content;
        if (row.title) text = row.title + ' ' + text;
        if (text && text.length > 30) {
          results.push({ text, label });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function removeDuplicates(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = item.text.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function preprocessText(text) {
  const norm = normalizeText(text);
  const tokens = tokenizer.tokenize(norm);
  const filtered = tokens.filter(t => t && !stopwords.includes(t));
  const stemmed = filtered.map(t => natural.PorterStemmer.stem(t));
  // Return joined stemmed tokens for tfidf
  return stemmed.join(' ');
}

function vectorizeText(articles) {
  const tfidf = new natural.TfIdf();
  // Build vocab: tokenize and stem all preprocessed texts, collect unique terms
  const vocabSet = new Set();
  const tokenizer = new natural.WordTokenizer();
  articles.forEach(a => {
    const tokens = tokenizer.tokenize(a.processed);
    tokens.forEach(token => {
      const stemmed = natural.PorterStemmer.stem(token);
      vocabSet.add(stemmed);
    });
  });
  const vocab = Array.from(vocabSet);
  // Add documents to tfidf (using processed text)
  articles.forEach(a => tfidf.addDocument(a.processed));
  // For each document, create a dense vector of tfidf scores for each vocab term
  const vectors = articles.map((a, i) =>
    vocab.map(term => tfidf.tfidf(term, i))
  );
  // Save IDF values for each vocab term
  const idf = {};
  vocab.forEach(term => {
    idf[term] = tfidf.idf(term);
  });
  // Save tfidf.documents for reconstructability (so you can re-add them to a new TfIdf instance for prediction)
  const tfidfDocuments = tfidf.documents;
  return { vectors, vocab, idf, tfidfDocuments };
}

function splitTrainTest(data, testRatio = 0.2) {
  const shuffled = data.slice().sort(() => Math.random() - 0.5);
  const testCount = Math.floor(data.length * testRatio);
  return {
    train: shuffled.slice(testCount),
    test: shuffled.slice(0, testCount),
  };
}

// Map LIAR label to binary: FAKE (1): 'pants-fire', 'false', 'barely-true'; REAL (0): 'half-true', 'mostly-true', 'true'
function liarLabelToBinary(label) {
  return ['pants-fire', 'false', 'barely-true'].includes(label) ? 1 : 0;
}

// Loader for LIAR dataset, using binary mapping
function loadLiarTsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return reject(err);
      const lines = data.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split('\t');
        if (cols.length < 3) continue;
        const label = cols[1].trim();
        const text = cols[2].trim();
        const labelIdx = liarLabelToBinary(label);
        if (text && text.length > 30) {
          results.push({ text, label: labelIdx });
        }
      }
      resolve(results);
    });
  });
}

// Stratified split for binary labels
function splitTrainTest(data, testRatio = 0.2) {
  // Separate by class
  const byClass = { 0: [], 1: [] };
  data.forEach(item => byClass[item.label].push(item));
  // Shuffle each class
  Object.keys(byClass).forEach(k => byClass[k].sort(() => Math.random() - 0.5));
  // Split each class
  const testCount0 = Math.floor(byClass[0].length * testRatio);
  const testCount1 = Math.floor(byClass[1].length * testRatio);
  const test = byClass[0].slice(0, testCount0).concat(byClass[1].slice(0, testCount1));
  const train = byClass[0].slice(testCount0).concat(byClass[1].slice(testCount1));
  // Shuffle final sets
  return {
    train: train.sort(() => Math.random() - 0.5),
    test: test.sort(() => Math.random() - 0.5),
  };
}

// Loader for WELFake_Dataset.csv (already binary)
function loadWelFakeCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        let text = '';
        if (row.text) text = row.text;
        if (row.title) text = row.title + ' ' + text;
        let lbl = row.label && row.label.toLowerCase() === 'fake' ? 1 : 0;
        if (text && text.length > 30) {
          results.push({ text, label: lbl });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Loader for ISOT/other CSVs (binary)
function loadAndProcessCsv(filePath, label) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        let text = '';
        if (row.text) text = row.text;
        else if (row.article_content) text = row.article_content;
        else if (row.content) text = row.content;
        if (row.title) text = row.title + ' ' + text;
        if (text && text.length > 30) {
          results.push({ text, label });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Loader for MongoDB (binary, real news)
async function loadRealNewsFromMongoDB(limit = 5000) {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB);
  const articles = await db.collection(MONGO_COLLECTION)
    .find({ description: { $exists: true, $type: 'string', $ne: '' } })
    .limit(limit)
    .toArray();
  await client.close();
  return articles.map(a => ({
    text: [a.title, a.description, a.content].filter(Boolean).join(' '),
    label: REAL_LABEL
  }));
}

async function runDataPreparation() {
  console.log('Loading ISOT, WELFake, LIAR, and MongoDB datasets...');
  const csvFiles = [
    { file: 'Fake.csv', label: 1 },
    { file: 'True.csv', label: 0 },
    { file: 'WELFake_Dataset.csv', label: null }, // Will parse label from file
  ];
  let allArticles = [];
  for (const { file, label } of csvFiles) {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    if (file === 'WELFake_Dataset.csv') {
      const welFake = await loadWelFakeCsv(filePath);
      console.log(`Loaded WELFake: ${welFake.length} articles from ${file}`);
      allArticles = allArticles.concat(welFake);
    } else {
      const articles = await loadAndProcessCsv(filePath, label);
      console.log(`Loaded ISOT: ${articles.length} articles from ${file}`);
      allArticles = allArticles.concat(articles);
    }
  }
  // Load LIAR dataset (binary)
  for (const liarFile of LIAR_FILES) {
    const liarPath = path.join(LIAR_DIR, liarFile);
    if (fs.existsSync(liarPath)) {
      const liarArticles = await loadLiarTsv(liarPath);
      console.log(`Loaded LIAR: ${liarArticles.length} articles from ${liarFile}`);
      allArticles = allArticles.concat(liarArticles);
    }
  }
  // Load real news from MongoDB
  const realNews = await loadRealNewsFromMongoDB(5000);
  console.log(`Loaded MongoDB: ${realNews.length} articles from MongoDB`);
  allArticles = allArticles.concat(realNews);
  // Deduplicate
  const beforeDedup = allArticles.length;
  allArticles = removeDuplicates(allArticles);
  console.log(`Deduplicated: ${beforeDedup} -> ${allArticles.length} articles`);
  // Preprocess
  console.log('Preprocessing articles...');
  allArticles.forEach(a => { a.processed = preprocessText(a.text); });
  console.log('Preprocessing complete.');
  // Vectorize
  console.log('Vectorizing articles...');
  const { vectors, vocab, idf, tfidfDocuments } = vectorizeText(allArticles);
  console.log(`Vectorization complete. Vocab size: ${vocab.length}`);
  // Stratified split
  const dataWithLabels = allArticles.map((a, i) => ({ vector: vectors[i], label: a.label }));
  const { train, test } = splitTrainTest(dataWithLabels);
  // Save
  fs.writeFileSync(path.join(OUTPUT_DIR, 'vocabulary.json'), JSON.stringify(vocab));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'idf.json'), JSON.stringify(idf));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'train_data.json'), JSON.stringify(train));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'test_data.json'), JSON.stringify(test));
  // Save tfidf.documents for future reconstructability
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tfidf_documents.json'), JSON.stringify(tfidfDocuments));
  console.log(`Saved: ${train.length} train, ${test.length} test, vocab size: ${vocab.length}`);
}

runDataPreparation().catch(console.error); 