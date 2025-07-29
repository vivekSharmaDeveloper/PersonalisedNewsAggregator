const express = require('express');
const Article = require('../models/Article');

const emojis = require('./emojis');
const users = require('./users');
const analyze = require('./analyze');
const internal = require('./internal');
const health = require('./health');
const articles = require('./articles');
const realtime = require('./realtime');
const newsQueue = require('../queues/newsQueue');
const { validate } = require('../middlewares/validation');
const { newsIngestSchema } = require('../validators/schemas');

const router = express.Router();

// Add the greeting endpoint that the test expects
router.get('/hello', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏'
  });
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, interests } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Validate page parameter
    if (pageNum < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid page parameter',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'page', message: 'Page must be a positive integer' }]
      });
    }

    // Validate limit parameter
    if (limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid limit parameter',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'limit', message: 'Limit must be between 1 and 50' }]
      });
    }

    const skip = (pageNum - 1) * limitNum;

    console.log('📊 Fetching articles with params:', { page: pageNum, limit: limitNum, category, interests });

    // Build filter
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }

    // If interests are provided and category is 'All', prioritize by interests
    if (interests && (!category || category === 'All')) {
      const interestList = interests.split(',').map(i => i.trim());
      console.log('🎯 Filtering by interests:', interestList);
      
      const articles = await Article.aggregate([
        {
          $addFields: {
            isPreferred: {
              $cond: {
                if: { $in: ['$category', interestList] },
                then: 1,
                else: 0
              }
            },
            hasImage: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$urlToImage', null] },
                    { $ne: ['$urlToImage', ''] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        },
        { $sort: { isPreferred: -1, hasImage: -1, publishedAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ]);
      
      const total = await Article.countDocuments({});
      console.log(`✅ Found ${articles.length} articles (${total} total)`);
      
      return res.json({
        articles,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }

    // Regular category-based filtering
    const articles = await Article.aggregate([
      { $match: filter },
      {
        $addFields: {
          hasImage: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$urlToImage', null] },
                  { $ne: ['$urlToImage', ''] }
                ]
              },
              then: 1,
              else: 0
            }
          }
        }
      },
      { $sort: { hasImage: -1, publishedAt: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ]);
    
    const total = await Article.countDocuments(filter);
    console.log(`✅ Found ${articles.length} articles (${total} total) for category: ${category || 'All'}`);
    
    res.json({
      articles,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch articles',
      error: error.message 
    });
  }
});

router.post('/ingest', validate(newsIngestSchema), async (req, res) => {
  try {
    const { source = 'all' } = req.body;
    
    // Add job to the queue with proper job name and options
    const job = await newsQueue.add(
      'fetchAndProcessNews', // Job name that matches what the worker expects
      { source },
      {
        jobId: `news-ingest-${Date.now()}`, // Unique job ID
        attempts: 3, // Retry 3 times if job fails
        backoff: { type: 'exponential', delay: 2000 }, // Exponential backoff for retries
        removeOnComplete: 10, // Keep only last 10 completed jobs
        removeOnFail: 5, // Keep only last 5 failed jobs
      }
    );
    
    console.log(`✅ News ingestion job added to queue. Job ID: ${job.id}`);
    res.json({ 
      status: 'success',
      message: 'News ingestion job added to queue', 
      jobId: job.id,
      source 
    });
  } catch (error) {
    console.error('❌ Error adding job to queue:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to add job to queue',
      error: error.message 
    });
  }
});

router.use('/health', health);
router.use('/emojis', emojis);
router.use('/users', users);
router.use('/realtime', realtime);
router.use(analyze);

// Expose /check-fake-status at the top level
router.use('/check-fake-status', internal);
router.use(internal);

module.exports = router;
