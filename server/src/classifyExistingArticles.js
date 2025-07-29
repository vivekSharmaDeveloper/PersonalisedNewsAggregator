const mongoose = require('mongoose');
const axios = require('axios');
const Article = require('./models/Article');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/news-aggregator';
console.log(MONGODB_URI)
const API_FAKE_NEWS_URL = 'http://localhost:3001/detect-fake-news';

async function classifyAndUpdateArticle(article) {
  try {
    const text = [article.title, article.description, article.content].filter(Boolean).join(' ');
    const res = await axios.post(API_FAKE_NEWS_URL, { text });
    if (res.data) {
      article.isFake = res.data.label === 1;
      article.fakeProbability = res.data.probability;
      article.classificationTimestamp = new Date();
      await article.save();
      console.log(`Classified article: ${article._id} (${article.title.slice(0, 40)}...)`);
    }
  } catch (err) {
    console.error(`Error classifying article ${article._id}:`, err.response?.data || err.message);
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const query = {
    $or: [
      { isFake: { $exists: false } },
      { fakeProbability: { $exists: false } },
      { classificationTimestamp: { $exists: false } }
    ]
  };
  const articles = await Article.find(query);
  console.log(`Found ${articles.length} articles to classify.`);
  let processed = 0;
  for (const article of articles) {
    await classifyAndUpdateArticle(article);
    processed++;
    if (processed % 10 === 0) {
      console.log(`Processed ${processed}/${articles.length}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
}); 