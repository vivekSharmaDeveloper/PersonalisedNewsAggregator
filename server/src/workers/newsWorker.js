const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const axios = require('axios');
const Article = require('../models/Article');
const { analyzeSentiment } = require('../utils/sentiment');
const socketService = require('../services/socketService');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Import the news fetching functions from newsIngest.js
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/news-aggregator';
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWSAPI_KEY}`;
const GNEWS_KEY = process.env.GNEWS_KEY;
const GNEWS_URL = `https://gnews.io/api/v4/top-headlines?token=${GNEWS_KEY}&lang=en&country=us`;
const MEDIASTACK_KEY = process.env.MEDIASTACK_KEY;
const MEDIASTACK_URL = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&countries=us&languages=en`;
const GUARDIAN_KEY = process.env.GUARDIAN_KEY;
const GUARDIAN_URL = `https://content.guardianapis.com/search?api-key=${GUARDIAN_KEY}&show-fields=all`;
const NEWSDATA_KEY = process.env.NEWSDATA_KEY;
const NEWSDATA_URL = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&country=us&language=en`;

const ML_SERVICE_ENABLED = process.env.ML_SERVICE_ENABLED === 'true';
const API_SENTIMENT_URL = process.env.ML_SENTIMENT_URL || 'http://localhost:5000/api/v1/analyze-sentiment';
const API_FAKE_NEWS_URL = process.env.ML_FAKE_NEWS_URL || 'http://localhost:3001/detect-fake-news';

// News fetching functions (copied from newsIngest.js)
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

// Category detection function
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

// Article normalization functions
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

// ML service functions
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

// Main job processing function
async function ingestNewsJob(job) {
  const { source } = job.data;
  console.log(`🚀 Starting news ingestion job from source: ${source}`);
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Fetch news from all sources
    console.log('📰 Fetching news from multiple sources...');
    const newsapiArticles = await fetchNewsAPI();
    const gnewsArticles = await fetchGNews();
    const mediastackArticles = await fetchMediastack();
    const guardianArticles = await fetchGuardian();
    const newsdataArticles = await fetchNewsdata();

    // Normalize all articles
    const allArticles = [
      ...newsapiArticles.map(a => normalizeArticle(a, 'NewsAPI')),
      ...gnewsArticles.map(a => normalizeArticle(a, 'GNews')),
      ...mediastackArticles.map(normalizeMediastack),
      ...guardianArticles.map(normalizeGuardian),
      ...newsdataArticles.map(normalizeNewsdata),
    ];

    console.log(`📊 Found ${allArticles.length} articles to process`);

    let saved = 0;
    let newArticles = [];
    
    for (const article of allArticles) {
      if (!article.url) continue;
      
      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({ url: article.url });
        const isNewArticle = !existingArticle;
        
        // Call ML service for sentiment analysis (only if enabled)
        if (ML_SERVICE_ENABLED) {
          const sentiment = await getSentimentFromService(article.description || article.content || article.title || '');
          if (sentiment) {
            article.sentimentScore = sentiment.score;
            article.sentimentLabel = sentiment.label;
          }
        }

        // Call ML service for fake news detection (only if enabled)
        if (ML_SERVICE_ENABLED) {
          const fakeResult = await getFakeNewsClassification(
            [article.title, article.description, article.content].filter(Boolean).join(' ')
          );
          if (fakeResult) {
            article.isFake = fakeResult.label === 1;
            article.fakeProbability = fakeResult.probability;
            article.classificationTimestamp = new Date();
          } else {
            // Fallback when ML service fails
            article.isFake = false;
            article.fakeProbability = 0.5;
            article.classificationTimestamp = new Date();
          }
        } else {
          // Default values when ML service is disabled
          article.isFake = false;
          article.fakeProbability = 0.5;
          article.classificationTimestamp = new Date();
        }

        // Separate ML fields from article data
        const {
          isFake,
          fakeProbability,
          classificationTimestamp,
          sentimentScore,
          sentimentLabel,
          ...articleForInsert
        } = article;

        // Upsert article with ML analysis
        const result = await Article.updateOne(
          { url: article.url },
          {
            $set: {
              isFake,
              fakeProbability,
              classificationTimestamp,
              sentimentScore,
              sentimentLabel,
            },
            $setOnInsert: articleForInsert
          },
          { upsert: true }
        );
        
        // If it's a new article, add to broadcast list
        if (isNewArticle && result.upsertedCount > 0) {
          const fullArticle = await Article.findOne({ url: article.url });
          if (fullArticle) {
            newArticles.push(fullArticle);
            
            // Broadcast new article via WebSocket (individual articles)
            try {
              socketService.broadcastNewArticle(fullArticle);
              
              // Check if it's breaking news (high sentiment or from reliable sources)
              const isBreakingNews = (
                fullArticle.sentimentScore > 0.7 || 
                ['BBC', 'Reuters', 'AP News', 'Guardian'].includes(fullArticle.source) ||
                fullArticle.category === 'Politics'
              );
              
              if (isBreakingNews) {
                socketService.sendBreakingNews(fullArticle, 'high');
                console.log(`🚨 Breaking news broadcasted: ${fullArticle.title}`);
              }
            } catch (socketError) {
              console.error('WebSocket broadcast error:', socketError.message);
            }
          }
        }
        
        saved++;
      } catch (err) {
        if (err.code !== 11000) {
          console.error('Error processing article:', err.message);
        }
      }
    }

    console.log(`✅ Successfully processed and saved ${saved} articles`);
    
    // Broadcast analytics update if we have new articles
    if (newArticles.length > 0) {
      try {
        const analyticsData = {
          newArticlesCount: newArticles.length,
          totalProcessed: saved,
          categories: newArticles.reduce((acc, article) => {
            acc[article.category] = (acc[article.category] || 0) + 1;
            return acc;
          }, {}),
          sources: newArticles.reduce((acc, article) => {
            acc[article.source] = (acc[article.source] || 0) + 1;
            return acc;
          }, {}),
          processingTime: Date.now() - job.processedOn,
          timestamp: new Date()
        };
        
        socketService.broadcastAnalyticsUpdate(analyticsData);
        console.log(`📊 Analytics update broadcasted: ${newArticles.length} new articles`);
      } catch (analyticsError) {
        console.error('Analytics broadcast error:', analyticsError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Job failed:', error.message);
    throw error; // Re-throw to mark job as failed
  } finally {
    // Always disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

const worker = new Worker('news-ingest', ingestNewsJob, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed!`);
});
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
}); 