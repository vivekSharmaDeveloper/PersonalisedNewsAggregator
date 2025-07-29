const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  source: { type: String, required: true },
  author: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  urlToImage: { type: String },
  publishedAt: { type: Date, required: true },
  content: { type: String },
  category: { type: String },
  sentimentScore: { type: Number },
  sentimentLabel: { type: String },
  isFake: { type: Boolean },
  fakeProbability: { type: Number, min: 0, max: 1 },
  classificationTimestamp: { type: Date },
}, { timestamps: true });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article; 