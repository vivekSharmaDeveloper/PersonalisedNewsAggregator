import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { MongoClient } from 'mongodb';
import natural from 'natural';

const stopwords = natural.stopwords;
const tokenizer = new natural.WordTokenizer();

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use project-wide convention for data directories
const CSV_DIR = path.join(__dirname, '../../ml_data/fake_news/raw_external_datasets/');
const OUTPUT_DIR = path.join(__dirname, '../../ml_data/fake_news/processed/');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/News Aggregator';
const MONGO_DB = 'News Aggregator';
const MONGO_COLLECTION = 'articles';

// --- Optimization Parameters ---
const MAX_ARTICLES = 25000; // Limit total articles for faster processing
const MAX_VOCAB_SIZE = 5000; // Limit vocabulary size
const MIN_TERM_FREQUENCY = 3; // Only include terms that appear at least 3 times

// --- Label Constants ---
const REAL_LABEL = 0;
const FAKE_LABEL = 1;
const LIAR_DIR = path.join(__dirname, '../datasets/archive');
const LIAR_FILES = ['train.tsv', 'valid.tsv', 'test.tsv'];

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function loadAndProcessCsv(filePath, label, limit = 10000) {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (count >= limit) return;
        let text = '';
        if (row.text) text = row.text;
        else if (row.article_content) text = row.article_content;
        else if (row.content) text = row.content;
        if (row.title) text = row.title + ' ' + text;
        if (text && text.length > 30 && text.length < 5000) { // Also limit max length
          results.push({ text, label });
          count++;
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function removeDuplicates(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = item.text.trim().toLowerCase().substring(0, 100); // Use first 100 chars for dedup
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
    .trim()
    .substring(0, 1000); // Limit text length
}

function preprocessText(text) {
  const norm = normalizeText(text);
  const tokens = tokenizer.tokenize(norm);
  const filtered = tokens.filter(t => t && t.length > 2 && !stopwords.includes(t));
  const stemmed = filtered.slice(0, 100).map(t => natural.PorterStemmer.stem(t)); // Limit tokens
  return stemmed.join(' ');
}

// Optimized vectorization with limited vocabulary
function optimizedVectorize(articles) {
  console.log('Building vocabulary...');
  const termFreq = new Map();
  
  // Count term frequencies
  articles.forEach(a => {
    const tokens = tokenizer.tokenize(a.processed);
    tokens.forEach(token => {
      const stemmed = natural.PorterStemmer.stem(token);
      termFreq.set(stemmed, (termFreq.get(stemmed) || 0) + 1);
    });
  });

  // Filter vocabulary by frequency and limit size
  const vocab = Array.from(termFreq.entries())
    .filter(([term, freq]) => freq >= MIN_TERM_FREQUENCY)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, MAX_VOCAB_SIZE)
    .map(([term]) => term);

  console.log(`Vocabulary size: ${vocab.length}`);

  // Create term index for faster lookup
  const termIndex = new Map();
  vocab.forEach((term, idx) => termIndex.set(term, idx));

  console.log('Creating vectors...');
  const vectors = [];
  
  // Process articles in batches
  const batchSize = 1000;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(articles.length/batchSize)}`);
    
    batch.forEach(article => {
      const vector = new Array(vocab.length).fill(0);
      const tokens = tokenizer.tokenize(article.processed);
      const termCount = new Map();
      
      // Count terms in document
      tokens.forEach(token => {
        const stemmed = natural.PorterStemmer.stem(token);
        if (termIndex.has(stemmed)) {
          termCount.set(stemmed, (termCount.get(stemmed) || 0) + 1);
        }
      });
      
      // Calculate TF-IDF (simplified)
      const docLength = tokens.length;
      termCount.forEach((count, term) => {
        const idx = termIndex.get(term);
        const tf = count / docLength;
        const df = termFreq.get(term);
        const idf = Math.log(articles.length / df);
        vector[idx] = tf * idf;
      });
      
      vectors.push(vector);
    });
  }

  // Calculate IDF values
  const idf = {};
  vocab.forEach(term => {
    const df = termFreq.get(term);
    idf[term] = Math.log(articles.length / df);
  });

  return { vectors, vocab, idf };
}

// Map LIAR label to binary
function liarLabelToBinary(label) {
  return ['pants-fire', 'false', 'barely-true'].includes(label) ? 1 : 0;
}

// Loader for LIAR dataset, with limit
function loadLiarTsv(filePath, limit = 2000) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return reject(err);
      const lines = data.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim() || count >= limit) continue;
        const cols = line.split('\t');
        if (cols.length < 3) continue;
        const label = cols[1].trim();
        const text = cols[2].trim();
        const labelIdx = liarLabelToBinary(label);
        if (text && text.length > 30 && text.length < 5000) {
          results.push({ text, label: labelIdx });
          count++;
        }
      }
      resolve(results);
    });
  });
}

// Stratified split for binary labels
function splitTrainTest(data, testRatio = 0.2) {
  const byClass = { 0: [], 1: [] };
  data.forEach(item => byClass[item.label].push(item));
  
  Object.keys(byClass).forEach(k => byClass[k].sort(() => Math.random() - 0.5));
  
  const testCount0 = Math.floor(byClass[0].length * testRatio);
  const testCount1 = Math.floor(byClass[1].length * testRatio);
  const test = byClass[0].slice(0, testCount0).concat(byClass[1].slice(0, testCount1));
  const train = byClass[0].slice(testCount0).concat(byClass[1].slice(testCount1));
  
  return {
    train: train.sort(() => Math.random() - 0.5),
    test: test.sort(() => Math.random() - 0.5),
  };
}

// Loader for WELFake_Dataset.csv with limit
function loadWelFakeCsv(filePath, limit = 15000) {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (count >= limit) return;
        let text = '';
        if (row.text) text = row.text;
        if (row.title) text = row.title + ' ' + text;
        let lbl = row.label && row.label.toLowerCase() === 'fake' ? 1 : 0;
        if (text && text.length > 30 && text.length < 5000) {
          results.push({ text, label: lbl });
          count++;
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function runOptimizedDataPreparation() {
  console.log('Loading datasets with limits for optimization...');
  const csvFiles = [
    { file: 'Fake.csv', label: 1, limit: 8000 },
    { file: 'True.csv', label: 0, limit: 8000 },
    { file: 'WELFake_Dataset.csv', label: null, limit: 6000 },
  ];
  
  let allArticles = [];
  
  for (const { file, label, limit } of csvFiles) {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    
    if (file === 'WELFake_Dataset.csv') {
      const welFake = await loadWelFakeCsv(filePath, limit);
      console.log(`Loaded WELFake: ${welFake.length} articles from ${file}`);
      allArticles = allArticles.concat(welFake);
    } else {
      const articles = await loadAndProcessCsv(filePath, label, limit);
      console.log(`Loaded ISOT: ${articles.length} articles from ${file}`);
      allArticles = allArticles.concat(articles);
    }
  }
  
  // Load LIAR dataset with limit
  for (const liarFile of LIAR_FILES) {
    const liarPath = path.join(LIAR_DIR, liarFile);
    if (fs.existsSync(liarPath)) {
      const liarArticles = await loadLiarTsv(liarPath, 1000);
      console.log(`Loaded LIAR: ${liarArticles.length} articles from ${liarFile}`);
      allArticles = allArticles.concat(liarArticles);
    }
  }

  // Skip MongoDB for speed
  console.log('Skipping MongoDB for optimization.');
  
  // Deduplicate
  const beforeDedup = allArticles.length;
  allArticles = removeDuplicates(allArticles);
  console.log(`Deduplicated: ${beforeDedup} -> ${allArticles.length} articles`);
  
  // Limit total articles
  if (allArticles.length > MAX_ARTICLES) {
    // Maintain class balance
    const fakeArticles = allArticles.filter(a => a.label === 1);
    const realArticles = allArticles.filter(a => a.label === 0);
    const fakeLimit = Math.min(fakeArticles.length, MAX_ARTICLES / 2);
    const realLimit = Math.min(realArticles.length, MAX_ARTICLES - fakeLimit);
    
    allArticles = [
      ...fakeArticles.slice(0, fakeLimit),
      ...realArticles.slice(0, realLimit)
    ].sort(() => Math.random() - 0.5);
    
    console.log(`Limited to ${allArticles.length} articles for optimization`);
  }
  
  // Preprocess
  console.log('Preprocessing articles...');
  allArticles.forEach((a, i) => {
    if (i % 1000 === 0) console.log(`Preprocessed ${i}/${allArticles.length}`);
    a.processed = preprocessText(a.text);
  });
  console.log('Preprocessing complete.');
  
  // Optimized vectorization
  console.log('Vectorizing articles with optimization...');
  const { vectors, vocab, idf } = optimizedVectorize(allArticles);
  console.log(`Vectorization complete. Vocab size: ${vocab.length}`);
  
  // Stratified split
  const dataWithLabels = allArticles.map((a, i) => ({ vector: vectors[i], label: a.label }));
  const { train, test } = splitTrainTest(dataWithLabels);
  
  // Save
  console.log('Saving files...');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'vocabulary.json'), JSON.stringify(vocab));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'idf.json'), JSON.stringify(idf));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'train_data.json'), JSON.stringify(train));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'test_data.json'), JSON.stringify(test));
  
  // Create a simple tfidf state for compatibility
  const tfidfState = {
    vocab: vocab,
    idf: idf,
    optimized: true
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tfidf_state.json'), JSON.stringify(tfidfState));
  
  console.log(`✅ Optimization complete!`);
  console.log(`📊 Dataset: ${train.length} train, ${test.length} test`);
  console.log(`📚 Vocabulary: ${vocab.length} terms`);
  console.log(`🎯 Class distribution:`);
  console.log(`   - Train: ${train.filter(t => t.label === 0).length} real, ${train.filter(t => t.label === 1).length} fake`);
  console.log(`   - Test: ${test.filter(t => t.label === 0).length} real, ${test.filter(t => t.label === 1).length} fake`);
}

runOptimizedDataPreparation().catch(console.error);
