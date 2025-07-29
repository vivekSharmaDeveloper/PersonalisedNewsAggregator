const axios = require('axios');
require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('./models/Article');
const cron = require('node-cron');
const { analyzeSentiment } = require('./utils/sentiment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/news-aggregator';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWSAPI_KEY}`;

// Example: GNews API (free tier, limited)
const GNEWS_KEY = process.env.GNEWS_KEY;
const GNEWS_URL = `https://gnews.io/api/v4/top-headlines?token=${GNEWS_KEY}&lang=en&country=us`;

const MEDIASTACK_KEY = process.env.MEDIASTACK_KEY;
const MEDIASTACK_URL = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&countries=us&languages=en`;

const GUARDIAN_KEY = process.env.GUARDIAN_KEY;
const GUARDIAN_URL = `https://content.guardianapis.com/search?api-key=${GUARDIAN_KEY}&show-fields=all`;

const NEWSDATA_KEY = process.env.NEWSDATA_KEY;
const NEWSDATA_URL = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&country=us&language=en`;

const API_SENTIMENT_URL = process.env.SENTIMENT_API_URL || 'http://localhost:5000/api/v1/analyze-sentiment';
const API_FAKE_NEWS_URL = 'http://localhost:3001/detect-fake-news';


async function fetchNewsAPI() {
  try {
    const res = await axios.get(NEWSAPI_URL);
    return res.data.articles || [];
  } catch (err) {
    console.error('Error fetching from NewsAPI:', err.message);
    return [];
  }
}

async function fetchGNews() {
  try {
    const res = await axios.get(GNEWS_URL);
    return res.data.articles || [];
  } catch (err) {
    console.error('Error fetching from GNews:', err.message);
    return [];
  }
}

async function fetchMediastack() {
  try {
    const res = await axios.get(MEDIASTACK_URL);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching from Mediastack:', err.message);
    return [];
  }
}

async function fetchGuardian() {
  try {
    const res = await axios.get(GUARDIAN_URL);
    return res.data.response.results || [];
  } catch (err) {
    console.error('Error fetching from Guardian:', err.message);
    return [];
  }
}

async function fetchNewsdata() {
  try {
    const res = await axios.get(NEWSDATA_URL);
    return res.data.results || [];
  } catch (err) {
    console.error('Error fetching from Newsdata:', err.message);
    return [];
  }
}

function getCategory(article) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  // Check for startup funding first to prioritize Business category over other categories
  if (text.match(/startup.*funding|funding.*startup|startup.*investment|venture.*capital|startup.*round/)) return 'Business';
  if (text.match(/ai|robot|tech|smartphone|software|hardware|gadget|computer|internet/)) return 'Technology';
  if (text.match(/finance|stock|market|cryptocurrency|dollar|investment|bank|economy|fund/)) return 'Finance';
  if (text.match(/climate|environment|wildlife|ocean|renewable|nature|pollution|conservation|earth/)) return 'Environment';
  if (text.match(/politic|election|government|senate|parliament|law|policy|minister|president/)) return 'Politics';
  if (text.match(/sport|football|soccer|cricket|basketball|tennis|olympic|athlete|match|tournament/)) return 'Sports';
  if (text.match(/health|medicine|disease|covid|virus|vaccine|doctor|hospital|mental|wellness/)) return 'Health';
  if (text.match(/science|research|space|nasa|physics|biology|chemistry|scientist|experiment/)) return 'Science';
  if (text.match(/movie|music|film|tv|show|celebrity|entertainment|actor|actress|award/)) return 'Entertainment';
  if (text.match(/business|company|startup|entrepreneur|industry|trade|commerce|corporate/)) return 'Business';
  if (text.match(/world|global|international|foreign|abroad|overseas|diplomat|united nations/)) return 'World';
  return 'General';
}

function normalizeArticle(article, sourceName) {
  return {
    source: sourceName,
    author: article.author || '',
    title: article.title || '',
    description: article.description || '',
    url: article.url,
    urlToImage: article.urlToImage || article.image || '',
    publishedAt: article.publishedAt || article.published_at || new Date(),
    content: article.content || '',
    category: getCategory(article),
  };
}

function normalizeMediastack(article) {
  return {
    source: 'Mediastack',
    author: article.author || '',
    title: article.title || '',
    description: article.description || '',
    url: article.url,
    urlToImage: article.image || '',
    publishedAt: article.published_at || new Date(),
    content: article.description || '',
    category: getCategory(article),
  };
}

function normalizeGuardian(article) {
  return {
    source: 'Guardian',
    author: article.fields && article.fields.byline ? article.fields.byline : '',
    title: article.webTitle || '',
    description: article.fields && article.fields.trailText ? article.fields.trailText : '',
    url: article.webUrl,
    urlToImage: article.fields && article.fields.thumbnail ? article.fields.thumbnail : '',
    publishedAt: article.webPublicationDate || new Date(),
    content: article.fields && article.fields.bodyText ? article.fields.bodyText : '',
    category: getCategory({ title: article.webTitle, description: article.fields && article.fields.trailText }),
  };
}

function normalizeNewsdata(article) {
  return {
    source: 'Newsdata',
    author: article.creator ? (Array.isArray(article.creator) ? article.creator.join(', ') : article.creator) : '',
    title: article.title || '',
    description: article.description || '',
    url: article.link,
    urlToImage: article.image_url || '',
    publishedAt: article.pubDate || new Date(),
    content: article.content || '',
    category: getCategory(article),
  };
}

async function getSentimentFromService(text) {
  try {
    const res = await axios.post(API_SENTIMENT_URL, { text });
    return res.data.sentiment;
  } catch (err) {
    console.error('Sentiment ML service error:', err.response?.data || err.message);
    return null;
  }
}

async function getFakeNewsClassification(text) {
  try {
    const res = await axios.post(API_FAKE_NEWS_URL, { text });
    return res.data;
  } catch (err) {
    console.error('Fake News ML service error:', err.response?.data || err.message);
    return null;
  }
}

async function ingestNews() {
  await mongoose.connect(MONGODB_URI);
  const newsapiArticles = await fetchNewsAPI();
  const gnewsArticles = await fetchGNews();
  const mediastackArticles = await fetchMediastack();
  const guardianArticles = await fetchGuardian();
  const newsdataArticles = await fetchNewsdata();
  const allArticles = [
    ...newsapiArticles.map(a => normalizeArticle(a, 'NewsAPI')),
    ...gnewsArticles.map(a => normalizeArticle(a, 'GNews')),
    ...mediastackArticles.map(normalizeMediastack),
    ...guardianArticles.map(normalizeGuardian),
    ...newsdataArticles.map(normalizeNewsdata),
  ];
  let saved = 0;
  for (const article of allArticles) {
    if (!article.url) continue;
    try {
      // Call ML service for sentiment
      const sentiment = await getSentimentFromService(article.description || article.content || article.title || '');
      if (sentiment) {
        article.sentimentScore = sentiment.score;
        article.sentimentLabel = sentiment.label;
      }
      // Call ML service for fake news detection
      const fakeResult = await getFakeNewsClassification(
        [article.title, article.description, article.content].filter(Boolean).join(' ')
      );
      if (fakeResult) {
        article.isFake = fakeResult.label === 1;
        article.fakeProbability = fakeResult.probability;
        article.classificationTimestamp = new Date();
      }
      // Remove ML fields from article before using in $setOnInsert
      const {
        isFake,
        fakeProbability,
        classificationTimestamp,
        sentimentScore,
        sentimentLabel,
        ...articleForInsert
      } = article;
      await Article.updateOne(
        { url: article.url },
        {
          $set: {
            isFake,
            fakeProbability,
            classificationTimestamp,
            sentimentScore,
            sentimentLabel,
            // ...any other fields you want to always update
          },
          $setOnInsert: articleForInsert // Only non-ML fields
        },
        { upsert: true }
      );
      saved++;
    } catch (err) {
      if (err.code !== 11000) console.error('Error saving article:', err.message);
    }
  }
  console.log(`[${new Date().toLocaleString()}] Ingested ${saved} articles.`);
  await mongoose.disconnect();
}

// Run immediately on script start
ingestNews();

// Schedule to run every 2 days at 2:00 AM
cron.schedule('0 2 */2 * *', () => {
  console.log('Running scheduled news ingestion (every 2 days at 2:00 AM)...');
  ingestNews();
}); 