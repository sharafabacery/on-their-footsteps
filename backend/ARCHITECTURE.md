# 🏗️ System Architecture Documentation

## Overview

The Islamic Characters platform follows a microservices architecture with clear separation of concerns, designed for scalability, maintainability, and performance.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React SPA)   │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Optional)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   File Storage  │
                       │   (Local/S3)    │
                       └─────────────────┘
```

## Component Architecture

### 1. Frontend Layer

**Technology Stack:**
- React 18+ with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- Axios for API communication

**Key Components:**
- **Pages**: Route-level components (CharacterDetail, Timeline, etc.)
- **Components**: Reusable UI components (CharacterHero, TimelineView, etc.)
- **Services**: API client and state management
- **Utils**: Helper functions and utilities

**Data Flow:**
```mermaid
graph TD
    A[User Action] --> B[React Component]
    B --> C[API Service]
    C --> D[HTTP Request]
    D --> E[Backend API]
    E --> F[Response Data]
    F --> G[State Update]
    G --> H[UI Re-render]
```

### 2. Backend API Layer

**Technology Stack:**
- FastAPI for REST API framework
- SQLAlchemy ORM for database operations
- Pydantic for data validation
- Redis for caching (optional)
- JWT for authentication

**Core Modules:**

#### API Routes (`app/api/`)
```
/api/
├── characters.py      # Character CRUD operations
├── auth.py           # Authentication endpoints
├── content.py        # Content management
├── progress.py       # User progress tracking
├── users.py          # User management
├── media.py          # File upload/management
├── analytics.py      # Usage analytics
├── stats.py          # Statistics
└── recommendations.py # Content recommendations
```

#### Business Logic (`app/`)
```
app/
├── models.py         # SQLAlchemy ORM models
├── schemas.py        # Pydantic data schemas
├── database.py       # Database configuration
├── cache.py          # Redis caching layer
├── security.py       # Authentication/authorization
├── config.py         # Application settings
├── logging_config.py # Logging configuration
└── utils/            # Helper utilities
```

### 3. Data Layer

#### Database Schema

```mermaid
erDiagram
    User ||--o{ UserProgress : tracks
    UserProgress }o--|| IslamicCharacter : tracked
    
    User {
        int id PK
        string username UK
        string email UK
        string full_name
        string hashed_password
        boolean is_active
        string language
        string theme
        datetime created_at
        datetime updated_at
    }
    
    IslamicCharacter {
        int id PK
        string name
        string arabic_name
        string english_name
        string title
        text description
        int birth_year
        int death_year
        string era
        string category
        string sub_category
        string slug UK
        text full_story
        json key_achievements
        json lessons
        json quotes
        json timeline_events
        string profile_image
        json gallery
        json audio_stories
        json animations
        string birth_place
        string death_place
        json locations
        json related_characters
        int views_count
        int likes_count
        int shares_count
        boolean is_featured
        boolean is_verified
        string verification_source
        text verification_notes
        datetime created_at
        datetime updated_at
    }
    
    UserProgress {
        int id PK
        int user_id FK
        int character_id FK
        float completion_percentage
        json viewed_content
        json bookmarks
        json notes
        datetime last_accessed
        datetime created_at
        datetime updated_at
    }
```

## Data Flow Architecture

### 1. Character Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    participant R as Redis
    
    U->>F: Request character detail
    F->>A: GET /api/characters/{id}
    A->>R: Check cache
    R-->>A: Cache miss
    A->>D: Query character
    D-->>A: Character data
    A->>R: Cache result
    A-->>F: Character response
    F-->>U: Display character
```

### 2. User Progress Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    
    U->>F: View character content
    F->>A: POST /api/progress/view
    A->>D: Update progress record
    D-->>A: Progress updated
    A-->>F: Progress data
    F-->>U: Update UI
```

### 3. Search Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    
    U->>F: Enter search query
    F->>A: GET /api/content/search?q=query
    A->>D: Search across fields
    D-->>A: Search results
    A->>R: Cache results
    A-->>F: Search response
    F-->>U: Display results
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    
    U->>F: Submit credentials
    F->>A: POST /api/auth/login
    A->>D: Validate credentials
    D-->>A: User data
    A->>A: Generate JWT token
    A-->>F: JWT token + user data
    F->>F: Store token
    F-->>U: Login success
```

### Authorization Model

```mermaid
graph TD
    A[JWT Token] --> B{Token Validation}
    B --> C{User Active?}
    C -->|Yes| D[Authorized Access]
    C -->|No| E[401 Unauthorized]
    
    D --> F{Check Permissions}
    F -->|Allowed| G[Resource Access]
    F -->|Denied| H[403 Forbidden]
```

## Caching Strategy

### Cache Hierarchy

1. **Application Cache** (Memory)
   - User sessions
   - Configuration data
   - Temporary computations

2. **Redis Cache** (Distributed)
   - Character details (10 min)
   - Featured content (5 min)
   - Search results (2 min)
   - Categories/Eras (1 hour)

3. **Database Cache** (PostgreSQL)
   - Query result caching
   - Connection pooling
   - Index caching

### Cache Invalidation

```mermaid
graph TD
    A[Character Update] --> B[Invalidate Cache]
    B --> C[Redis Delete]
    C --> D[Update Database]
    D --> E[Cache Rebuild]
```

## Performance Architecture

### Database Optimization

**Indexing Strategy:**
```sql
-- Primary indexes
CREATE INDEX idx_characters_id ON islamic_characters(id);
CREATE INDEX idx_characters_slug ON islamic_characters(slug);

-- Search indexes
CREATE INDEX idx_characters_name ON islamic_characters(name);
CREATE INDEX idx_characters_arabic_name ON islamic_characters(arabic_name);
CREATE INDEX idx_characters_search ON islamic_characters USING gin(to_tsvector('arabic', name || ' ' || arabic_name || ' ' || description));

-- Filter indexes
CREATE INDEX idx_characters_category ON islamic_characters(category);
CREATE INDEX idx_characters_era ON islamic_characters(era);
CREATE INDEX idx_characters_featured ON islamic_characters(is_featured);

-- Performance indexes
CREATE INDEX idx_characters_views ON islamic_characters(views_count DESC);
CREATE INDEX idx_characters_likes ON islamic_characters(likes_count DESC);
CREATE INDEX idx_characters_created ON islamic_characters(created_at DESC);
```

### Query Optimization

**Connection Pooling:**
```python
# Database configuration
DATABASE_POOL_SIZE = 20
DATABASE_MAX_OVERFLOW = 30
DATABASE_POOL_TIMEOUT = 30
DATABASE_POOL_RECYCLE = 3600
```

**Query Optimization:**
- Use `select_related` for eager loading
- Implement pagination for large datasets
- Use database functions for aggregations
- Optimize N+1 queries with joins

## Monitoring Architecture

### Logging Structure

```mermaid
graph TD
    A[Application Logs] --> B[Structured Logger]
    B --> C[JSON Format]
    C --> D[Log Aggregator]
    D --> E[Elasticsearch]
    E --> F[Kibana Dashboard]
    
    G[Request Logs] --> H[Request ID]
    H --> I[Response Time]
    I --> J[Error Tracking]
```

### Metrics Collection

**Application Metrics:**
- Request count and response times
- Database query performance
- Cache hit rates
- Error rates by endpoint
- User activity statistics

**System Metrics:**
- CPU and memory usage
- Database connections
- Redis performance
- File system usage

## Deployment Architecture

### Development Environment

```mermaid
graph TD
    A[Developer Machine] --> B[Local Database]
    A --> C[Local Redis]
    A --> D[Development Server]
    
    D --> E[Hot Reload]
    D --> F[Debug Mode]
    D --> G[Development Logs]
```

### Production Environment

```mermaid
graph TD
    A[Load Balancer] --> B[API Server 1]
    A --> C[API Server 2]
    A --> D[API Server N]
    
    B --> E[Database Primary]
    C --> F[Database Replica]
    D --> G[Database Replica]
    
    B --> H[Redis Cluster]
    C --> H
    D --> H
    
    B --> I[File Storage]
    C --> I
    D --> I
```

### Container Architecture

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=on_their_footsteps
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

## Scalability Architecture

### Horizontal Scaling

```mermaid
graph TD
    A[Load Balancer] --> B[API Server 1]
    A --> C[API Server 2]
    A --> D[API Server 3]
    A --> E[API Server N]
    
    B --> F[Database Pool]
    C --> F
    D --> F
    E --> F
    
    B --> G[Redis Cluster]
    C --> G
    D --> G
    E --> G
```

### Database Scaling

**Read Replicas:**
- Primary database for writes
- Multiple read replicas for queries
- Connection routing based on operation type

**Sharding Strategy:**
- Horizontal partitioning by category
- Consistent hashing for distribution
- Cross-shard query support

## Integration Architecture

### External Services

```mermaid
graph TD
    A[API Server] --> B[Email Service]
    A --> C[File Storage]
    A --> D[Analytics Service]
    A --> E[CDN]
    
    B --> F[SMTP Server]
    C --> G[S3/MinIO]
    D --> H[Prometheus]
    E --> I[CloudFlare]
```

### Third-Party Integrations

**Authentication Providers:**
- OAuth 2.0 (Google, Facebook)
- SAML 2.0 (Enterprise SSO)
- LDAP/Active Directory

**Payment Processing:**
- Stripe (Credit Cards)
- PayPal (Digital Wallets)
- Local Payment Methods

**Communication:**
- Email (SendGrid, SES)
- SMS (Twilio)
- Push Notifications (Firebase)

## Development Workflow

### Code Organization

```
backend/
├── app/                    # Application code
│   ├── api/               # API routes
│   ├── models/            # Database models
│   ├── schemas/           # Data schemas
│   ├── services/           # Business logic
│   ├── utils/              # Utilities
│   └── config/            # Configuration
├── tests/                  # Test suite
├── migrations/             # Database migrations
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── requirements.txt         # Dependencies
```

### Development Process

1. **Feature Development**
   - Create feature branch
   - Implement code changes
   - Write tests
   - Update documentation

2. **Code Review**
   - Peer review process
   - Automated checks
   - Security review
   - Performance review

3. **Testing**
   - Unit tests
   - Integration tests
   - API tests
   - Performance tests

4. **Deployment**
   - Staging deployment
   - Integration testing
   - Production deployment
   - Monitoring setup

## Technology Decisions

### Framework Choices

**FastAPI:**
- High performance with async support
- Automatic OpenAPI documentation
- Type hints and validation
- Modern Python features

**SQLAlchemy:**
- Powerful ORM with relationship support
- Database agnostic design
- Migration support
- Performance optimization

**Redis:**
- In-memory caching for performance
- Session storage
- Rate limiting
- Pub/Sub messaging

### Database Design

**PostgreSQL:**
- Advanced JSON support
- Full-text search
- Window functions
- ACID compliance
- Extensible with extensions

## Future Architecture Plans

### Microservices Migration

```mermaid
graph TD
    A[Monolithic API] --> B[Character Service]
    A --> C[User Service]
    A --> D[Content Service]
    A --> E[Analytics Service]
    
    B --> F[Character DB]
    C --> G[User DB]
    D --> H[Content DB]
    E --> I[Analytics DB]
    
    B --> J[API Gateway]
    C --> J
    D --> J
    E --> J
```

### Event-Driven Architecture

```mermaid
graph TD
    A[API Service] --> B[Message Broker]
    B --> C[Character Service]
    B --> D[User Service]
    B --> E[Analytics Service]
    
    C --> F[Event Store]
    D --> F
    E --> F
    
    F --> G[Event Sourcing]
    G --> H[Read Models]
    G --> I[CQRS Pattern]
```

## Security Considerations

### Data Protection

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **Data Anonymization**: PII protection
- **Access Control**: Role-based permissions

### Threat Mitigation

- **Injection Prevention**: Parameterized queries
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Request throttling
- **Input Validation**: Comprehensive validation
- **CORS Configuration**: Proper origin handling

### Compliance

- **GDPR**: Data protection regulations
- **Privacy Policy**: User data handling
- **Audit Logging**: Comprehensive audit trail
- **Data Retention**: Policy-based retention

This architecture provides a solid foundation for the Islamic Characters platform with room for growth and evolution as requirements change.
