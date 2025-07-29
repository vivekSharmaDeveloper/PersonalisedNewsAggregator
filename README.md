# 📰 Personalized News Aggregator

> A modern, full-stack news aggregation platform with AI-powered fake news detection, sentiment analysis, and personalized content delivery.

[![CI/CD Pipeline](https://github.com/your-username/personalized-news-aggregator/workflows/CI-CD/badge.svg)](https://github.com/your-username/personalized-news-aggregator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

## 🚀 Features

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
- **Text Processing**: Natural.js for NLP
- **Model Training**: Python scripts for data preprocessing

### DevOps & Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions with comprehensive pipeline
- **Testing**: Jest + Supertest
- **Monitoring**: Custom health checks

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- MongoDB (local or cloud)
- Redis instance

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/personalized-news-aggregator.git
cd personalized-news-aggregator
```

### 2. Environment Setup
Create `.env` files in both `server` and `client` directories:

**Server `.env`:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/news-aggregator
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key

# API Keys
NEWSAPI_KEY=your-newsapi-key
GNEWS_KEY=your-gnews-key
GUARDIAN_KEY=your-guardian-api-key
MEDIASTACK_KEY=your-mediastack-key
NEWSDATA_KEY=your-newsdata-key

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Client `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1/
```

### 3. Docker Setup (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Manual Setup
```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start services in separate terminals
cd server && npm run dev
cd client && npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1
- **ML Service**: http://localhost:3001

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

## 🛠️ Development

### Project Structure
```
personalized-news-aggregator/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── server/                # Express.js backend API
│   ├── src/
│   │   ├── api/           # API route handlers
│   │   ├── models/        # Database models
│   │   ├── middlewares/   # Express middlewares
│   │   ├── workers/       # Background job workers
│   │   └── utils/         # Utility functions
│   └── package.json
├── ml_inference_service/  # Machine learning microservice
├── .github/workflows/     # CI/CD pipeline configurations
└── docker-compose.yml    # Multi-service orchestration
```

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

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Application environment | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `NEWSAPI_KEY` | News API key | Yes |
| `SENDGRID_API_KEY` | Email service key | No |

### API Configuration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for cross-origin requests
- **Security Headers**: Helmet.js for security headers
- **Request Validation**: Zod schemas for input validation

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

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core news aggregation
- ✅ User authentication
- ✅ Basic personalization
- ✅ Fake news detection

### Phase 2 (Upcoming)
- 🔄 Advanced ML models
- 🔄 Social features (sharing, comments)
- 🔄 Mobile application
- 🔄 Real-time notifications

### Phase 3 (Future)
- 📋 Multi-language support
- 📋 Advanced analytics dashboard
- 📋 API for third-party integrations
- 📋 Enterprise features

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
- **ML Libraries**: Natural.js, ml-logistic-regression
- **UI Components**: Radix UI, Lucide Icons
- **Infrastructure**: Docker, GitHub Actions

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-username/personalized-news-aggregator/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/personalized-news-aggregator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/personalized-news-aggregator/discussions)
- **Email**: support@yourproject.com

---

<div align="center">
  <p><strong>Made with ❤️ by the News Aggregator Team</strong></p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-development">Development</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>
