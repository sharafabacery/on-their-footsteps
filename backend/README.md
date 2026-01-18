# 🚀 على خطاهم Backend API

Comprehensive FastAPI backend for the Islamic characters educational platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)
- [Performance](#performance)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This backend provides a RESTful API for managing Islamic historical characters, user progress, authentication, and content delivery. It's built with FastAPI, PostgreSQL, and Redis for optimal performance and scalability.

## ✨ Features

- **Character Management**: CRUD operations for Islamic characters with rich metadata
- **User Authentication**: JWT-based authentication with role-based access
- **Progress Tracking**: User learning progress and statistics
- **Content Caching**: Redis caching for improved performance
- **Search & Filtering**: Advanced search across character data
- **Media Management**: File upload and media handling
- **Analytics**: Comprehensive usage statistics and metrics
- **Monitoring**: Health checks, logging, and performance metrics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Optional)    │
                       └─────────────────┘
```

### Core Components

- **API Layer**: FastAPI endpoints with automatic OpenAPI documentation
- **Business Logic**: Service layer for character management and user operations
- **Data Layer**: SQLAlchemy ORM with PostgreSQL
- **Caching Layer**: Redis for performance optimization
- **Authentication**: JWT tokens with secure password hashing
- **Logging**: Structured logging with request tracing

## 📋 Prerequisites

- **Python**: 3.10 or higher
- **PostgreSQL**: 15.0 or higher
- **Redis**: 7.0 or higher (optional but recommended)
- **Node.js**: 18.0 or higher (for frontend development)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/on-their-footsteps.git
cd on-their-footsteps/backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb on_their_footsteps

# Run migrations
alembic upgrade head

# Or create initial data
python seed_data.py
```

### 5. Environment Configuration

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost/on_their_footsteps

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Application
DEBUG=true
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Upload Settings
UPLOAD_DIR=./static/uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### 6. Start Development Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `SECRET_KEY` | JWT signing key | Auto-generated | ✅ |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | ❌ |
| `DEBUG` | Development mode | `false` | ❌ |
| `LOG_LEVEL` | Logging verbosity | `INFO` | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` | ❌ |

### Database Configuration

The application uses SQLAlchemy ORM with the following models:

- **IslamicCharacter**: Core character data
- **User**: User accounts and preferences
- **UserProgress**: Learning progress tracking

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/openapi.json`

### Core Endpoints

#### Characters API

```http
GET    /api/characters              # List characters with pagination
GET    /api/characters/{id}         # Get specific character
POST   /api/characters              # Create new character
PUT    /api/characters/{id}         # Update character
DELETE /api/characters/{id}         # Delete character
```

#### Authentication API

```http
POST   /api/auth/login              # User login
POST   /api/auth/register           # User registration
POST   /api/auth/refresh            # Refresh token
GET    /api/auth/me                 # Get current user
```

#### Content API

```http
GET    /api/content/categories      # Get all categories
GET    /api/content/eras            # Get all eras
GET    /api/content/search          # Search characters
GET    /api/content/featured/{type} # Get featured content
```

### Response Examples

#### Character Response

```json
{
  "id": 1,
  "name": "Abu Bakr",
  "arabic_name": "أبو بكر الصديق",
  "english_name": "Abu Bakr al-Siddiq",
  "title": "The First Caliph",
  "description": "The first caliph and closest companion of Prophet Muhammad",
  "category": "الصحابة",
  "era": "الخلافة الراشدة",
  "slug": "abu-bakr",
  "profile_image": "/static/images/abu-bakr.jpg",
  "views_count": 1500,
  "likes_count": 250,
  "is_featured": true,
  "is_verified": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Error Response

```json
{
  "detail": "Character not found",
  "error_code": "CHARACTER_NOT_FOUND",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789"
}
```

## 🗄️ Database Schema

### IslamicCharacter Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String(200) | Character name |
| `arabic_name` | String(200) | Arabic name |
| `title` | String(300) | Historical title |
| `description` | Text | Brief description |
| `category` | String(100) | Character category |
| `era` | String(100) | Historical era |
| `slug` | String(200) | URL identifier |
| `full_story` | Text | Complete biography |
| `views_count` | Integer | Profile views |
| `likes_count` | Integer | User likes |
| `is_featured` | Boolean | Featured status |
| `created_at` | DateTime | Creation timestamp |

### Relationships

- `User` → `UserProgress` (One-to-Many)
- `IslamicCharacter` → `UserProgress` (One-to-Many)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_characters.py

# Run with verbose output
pytest -v
```

### Test Structure

```
tests/
├── test_characters.py      # Character API tests
├── test_auth.py            # Authentication tests
├── test_content.py         # Content API tests
├── test_models.py          # Model tests
└── conftest.py            # Test configuration
```

### Example Test

```python
def test_get_characters(client, db_session):
    """Test character listing endpoint."""
    response = client.get("/api/characters")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
```

## 🚀 Deployment

### Development Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Using Python directly
python run.py
```

### Production Deployment

#### 1. Environment Setup

```bash
# Set production environment
export DEBUG=false
export LOG_LEVEL=INFO
export DATABASE_URL=postgresql://user:pass@prod-db:5432/app
```

#### 2. Using Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 3. Using Gunicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### 4. Environment Variables for Production

```env
DATABASE_URL=postgresql://user:secure_pass@db.example.com/on_their_footsteps
SECRET_KEY=generated-secure-key-here
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://yourdomain.com
REDIS_URL=redis://redis.example.com:6379
```

### Health Checks

```bash
# Application health
curl http://localhost:8000/api/health

# Database health
curl http://localhost:8000/api/health/database

# Redis health
curl http://localhost:8000/api/health/redis
```

## ⚡ Performance

### Caching Strategy

- **Character Details**: 10-minute cache
- **Featured Content**: 5-minute cache
- **Categories/Eras**: 1-hour cache
- **Search Results**: 2-minute cache

### Database Optimization

```sql
-- Recommended indexes
CREATE INDEX idx_characters_category ON islamic_characters(category);
CREATE INDEX idx_characters_era ON islamic_characters(era);
CREATE INDEX idx_characters_views ON islamic_characters(views_count DESC);
CREATE INDEX idx_characters_featured ON islamic_characters(is_featured, views_count DESC);
```

### Performance Monitoring

```bash
# Application metrics
curl http://localhost:8000/api/metrics

# Prometheus metrics
curl http://localhost:8000/api/metrics/prometheus
```

## 📊 Monitoring

### Logging

Logs are structured with request tracing:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "API request completed",
  "request_id": "req_123456789",
  "method": "GET",
  "url": "/api/characters",
  "status_code": 200,
  "duration": 0.123,
  "ip_address": "127.0.0.1"
}
```

### Metrics Available

- Request count and response times
- Database query performance
- Cache hit rates
- Error rates by endpoint
- User activity statistics

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check database connection
python -c "from app.database import engine; engine.connect()"

# Verify database URL
echo $DATABASE_URL
```

#### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis URL
echo $REDIS_URL
```

#### Performance Issues

```bash
# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Monitor cache performance
curl http://localhost:8000/api/metrics/cache
```

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

### Health Check Failures

```bash
# Check all health endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/api/health/database
curl http://localhost:8000/api/health/redis
```

## 📝 Development Guidelines

### Code Style

- Follow PEP 8 standards
- Use type hints for all functions
- Write comprehensive docstrings
- Include error handling for all external calls

### API Design

- Use RESTful conventions
- Include proper HTTP status codes
- Provide meaningful error messages
- Add request/response examples

### Testing

- Write unit tests for all business logic
- Include integration tests for API endpoints
- Test error conditions and edge cases
- Maintain >80% code coverage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@on-their-footsteps.com
- Documentation: https://docs.on-their-footsteps.com