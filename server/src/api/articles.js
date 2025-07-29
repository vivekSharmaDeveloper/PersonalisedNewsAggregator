const express = require('express');
const Article = require('../models/Article');
const { validate } = require('../middlewares/validation');
const { articleQuerySchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', validate(articleQuerySchema), async (req, res) => {
  try {
    const { page = 1, limit = 10, category, interests } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (interests) {
      const interestList = interests.split(',');
      const articles = await Article.aggregate([
        { $addFields: { 
            isPreferred: { $cond: { if: { $in: ["$category", interestList] }, then: 1, else: 0 } },
            hasImage: { $cond: { if: { $and: [ { $ne: ["$urlToImage", null] }, { $ne: ["$urlToImage", ""] } ] }, then: 1, else: 0 } }
        } },
        { $sort: { isPreferred: -1, hasImage: -1, publishedAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ]);
      const total = await Article.countDocuments({});
      return res.json({ articles, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    }

    const filter = {};
  if (category && category !== 'All') {
    filter["category"] = { $regex: new RegExp(`^${category}$`, 'i') };
  }
    const articles = await Article.aggregate([
        { $match: filter },
        { $addFields: {
            hasImage: { $cond: { if: { $and: [ { $ne: ["$urlToImage", null] }, { $ne: ["$urlToImage", ""] } ] }, then: 1, else: 0 } }
        } },
        { $sort: { hasImage: -1, publishedAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
    ]);
    const total = await Article.countDocuments(filter);
    res.json({ articles, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

module.exports = router;
