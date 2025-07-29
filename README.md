# 📰 Personalized News Aggregator

> A modern, full-stack news aggregation platform with AI-powered fake news detection, sentiment analysis, and personalized content delivery.


### 🔥 Core Features
- **🤖 AI-Powered Content Analysis**
  - Real-time fake news detection using machine learning
  - Sentiment analysis for articles
  - Content classification by category
  
- **📱 Modern User Experience**  
  - Responsive design with dark/light mode
  - Personalized news feed based on user interests
  - Advanced bookmarking system
  - Real-time article updates

- **🔐 Robust Authentication**
  - JWT-based secure authentication
  - Password reset via email
  - User profile management
  - Preference customization

- **⚡ High Performance**
  - Redis caching for improved speed
  - Background job processing with Bull queues
  - Optimized database queries
  - CDN-ready static assets

### 🧠 AI & Machine Learning
- **Fake News Detection**: Custom-trained logistic regression model with TF-IDF vectorization
- **Sentiment Analysis**: Real-time emotional tone analysis of articles
- **Content Categorization**: Automatic classification into 11+ categories
- **Personalization**: Interest-based content recommendation

### 📊 Data Sources
- NewsAPI
- GNews
- Mediastack
- The Guardian API
- Newsdata.io

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI + Custom components
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context + Custom hooks

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Queue System**: BullMQ
- **Authentication**: JWT with bcrypt

### ML/AI Services
- **Fake News Detection**: Custom Node.js service with ml-logistic-regression

### DevOps & Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions with comprehensive pipeline
- **Testing**: Jest + Supertest


## 📖 Usage Guide

### Getting Started
1. **Sign Up**: Create an account with email verification
2. **Onboarding**: Select your interests and preferred news sources
3. **Explore**: Browse personalized news feed on the Articles page
4. **Interact**: Bookmark articles, analyze sentiment, check fake news status

### Key Features

#### 🎯 Personalization
- Set interests in Technology, Politics, Sports, etc.
- Choose preferred news sources
- Get tailored content recommendations

#### 🔍 Content Analysis
- **Fake News Detection**: Click "Check Fake Status" for any article
- **Sentiment Analysis**: Analyze emotional tone of articles
- **Content Filtering**: Filter by categories and interests

#### 📱 User Experience
- **Dark Mode**: Toggle between light and dark themes
- **Bookmarks**: Save articles for later reading
- **Responsive Design**: Works seamlessly on all devices


### Available Scripts

#### Backend
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run all tests
npm run test:unit    # Run unit tests only
npm run test:integration # Run integration tests
npm run lint         # Lint and fix code
npm run workers      # Start background workers
```

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
```

### Testing Strategy
- **Unit Tests**: Individual function testing with Jest
- **Integration Tests**: API endpoint testing with Supertest
- **E2E Tests**: Full workflow testing in CI/CD pipeline
- **Coverage Reports**: Automated coverage tracking with Codecov

## 🚀 Deployment

### Docker Deployment
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Manual Deployment
1. **Build applications**:
   ```bash
   cd client && npm run build
   cd ../server && npm run build
   ```

2. **Set environment variables** for production

3. **Start services**:
   ```bash
   cd server && npm start
   cd client && npm start
   ```

### CI/CD Pipeline
The project includes a comprehensive GitHub Actions pipeline:
- ✅ Code quality checks (ESLint, TypeScript)
- ✅ Security scanning (npm audit, Snyk)
- ✅ Automated testing (unit, integration, E2E)
- ✅ Docker image building and pushing
- ✅ Staging deployment with health checks



## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Semantic commit messages
- **Testing**: Minimum 80% code coverage required

### Pull Request Guidelines
- Include tests for new features
- Update documentation as needed
- Ensure CI/CD pipeline passes
- Add appropriate labels and reviewers

## 📊 Performance & Monitoring

### Key Metrics
- **Response Time**: < 200ms average API response
- **Uptime**: 99.9% availability target
- **Cache Hit Rate**: > 85% for article requests
- **Test Coverage**: > 90% for critical paths

### Monitoring Features
- Health check endpoints
- Redis performance monitoring
- Database query optimization
- Error tracking and logging

## 🔒 Security Features

### Authentication & Authorization  
- JWT tokens with secure httpOnly cookies
- Password hashing with bcrypt (10 rounds)
- Rate limiting and request validation
- CORS configuration for API security

### Data Protection
- Input sanitization and validation
- SQL injection prevention with parameterized queries  
- XSS protection with content security policies
- Secure headers with Helmet.js

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Issues**
```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb
```

**Redis Connection Issues**
```bash
# Test Redis connection
redis-cli ping

# Check Redis status
docker-compose ps redis
```

**Build Failures**
```bash
# Clear all caches
npm run clean
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **News APIs**: NewsAPI, GNews, The Guardian, Mediastack, Newsdata.io
- **UI Components**: Radix UI, Lucide Icons
- **Infrastructure**: Docker, GitHub Actions

