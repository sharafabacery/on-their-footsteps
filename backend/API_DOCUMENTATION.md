# 📚 API Documentation

## Overview

This document provides comprehensive API documentation including response examples, error handling, and usage patterns for the Islamic characters platform API.

## Base URL

```
Development: http://localhost:8000/api
Production: https://api.on-their-footsteps.com/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "data": {},  // Response data
  "message": "Success message",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789"
}
```

### Error Response

```json
{
  "detail": "Error description",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789",
  "details": {}  // Additional error details (optional)
}
```

## API Endpoints

### Characters API

#### GET /api/characters

Retrieve paginated list of Islamic characters with filtering and sorting.

**Request Parameters:**
- `page` (int, optional): Page number (default: 1, min: 1)
- `limit` (int, optional): Items per page (default: 12, min: 1, max: 100)
- `category` (string, optional): Filter by category
- `era` (string, optional): Filter by historical era
- `sort` (string, optional): Sort field (name|views|likes|created|updated)

**Example Request:**
```http
GET /api/characters?page=1&limit=10&category=الصحابة&sort=views
```

**Success Response (200):**
```json
[
  {
    "id": 1,
    "name": "Umar ibn al-Khattab",
    "arabic_name": "عمر بن الخطاب",
    "english_name": "Umar ibn al-Khattab",
    "title": "The Second Caliph",
    "description": "The second caliph known for his justice and administrative skills",
    "category": "الصحابة",
    "era": "الخلافة الراشدة",
    "slug": "umar-ibn-al-khattab",
    "profile_image": "/static/images/umar.jpg",
    "views_count": 1500,
    "likes_count": 250,
    "shares_count": 45,
    "is_featured": true,
    "is_verified": true,
    "verification_source": "Islamic Scholars Council",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Umar ibn al-Khattab",
    "arabic_name": "عمر بن الخطاب",
    "english_name": "Umar ibn al-Khattab",
    "title": "The Second Caliph",
    "description": "The second caliph known for justice and administrative reforms",
    "category": "الصحابة",
    "era": "الخلافة الراشدة",
    "slug": "umar",
    "profile_image": "/static/images/umar.jpg",
    "views_count": 1200,
    "likes_count": 200,
    "shares_count": 38,
    "is_featured": true,
    "is_verified": true,
    "verification_source": "Islamic Scholars Council",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Error Responses:**

400 Bad Request:
```json
{
  "detail": "Invalid page number",
  "error_code": "INVALID_PARAMETER",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789",
  "details": {
    "parameter": "page",
    "value": -1,
    "constraint": "ge=1"
  }
}
```

500 Internal Server Error:
```json
{
  "detail": "Database connection failed",
  "error_code": "DATABASE_ERROR",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789"
}
```

#### GET /api/characters/{id}

Retrieve detailed character information by ID or slug.

**Path Parameters:**
- `id` (string|int): Character ID or slug

**Example Request:**
```http
GET /api/characters/abu-bakr
```

**Success Response (200):**
```json
{
  "id": 1,
  "name": "Umar ibn al-Khattab",
  "arabic_name": "عمر بن الخطاب",
  "english_name": "Umar ibn al-Khattab",
  "title": "The Second Caliph",
  "description": "The second caliph known for his justice and administrative skills",
  "birth_year": 584,
  "death_year": 644,
  "birth_place": "Mecca",
  "death_place": "Medina",
  "category": "الصحابة",
  "era": "الخلافة الراشدة",
  "slug": "umar-ibn-al-khattab",
  "profile_image": "/static/images/umar.jpg",
  "views_count": 1500,
  "likes_count": 250,
  "shares_count": 45,
  "is_featured": true,
  "is_verified": true,
  "verification_source": "Islamic Scholars Council",
  "verification_notes": "Verified by senior scholars",
  "created_at": "2024-01-01T00:00:00Z",
  "full_story": "Umar ibn al-Khattab was born in Mecca in 584 CE...",
  "key_achievements": [
    "Established Islamic calendar",
    "Expanded Islamic empire",
    "Codified Islamic law"
  ],
  "lessons": [
    "Justice and fairness",
    "Strong leadership",
    "Administrative excellence"
  ],
  "quotes": [
    "If a mule stumbles while walking, I would fear that I might have stumbled"
  ],
  "timeline_events": [
    {
      "year": 573,
      "title": "Birth",
      "description": "Event description"
      "description": "Born in Mecca to Abu Quhafah"
    },
    {
      "year": 610,
      "title": "Accepts Islam",
      "description": "Among the first to accept Islam"
    }
  ]
}
```

**Error Responses:**

404 Not Found:
```json
{
  "detail": "Character not found",
  "error_code": "CHARACTER_NOT_FOUND",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789",
  "details": {
    "character_id": "nonexistent-character"
  }
}
```

#### POST /api/characters

Create a new character record.

**Request Body:**
```json
{
  "name": "Character Name",
  "arabic_name": "اسم الشخصية",
  "english_name": "English Name",
  "title": "Historical Title",
  "description": "Brief description",
  "category": "الصحابة",
  "era": "الخلافة الراشدة",
  "birth_year": 573,
  "death_year": 634,
  "birth_place": "Mecca",
  "death_place": "Medina",
  "full_story": "Complete biographical narrative...",
  "key_achievements": ["Achievement 1", "Achievement 2"],
  "lessons": ["Lesson 1", "Lesson 2"],
  "quotes": ["Quote 1", "Quote 2"],
  "timeline_events": [
    {
      "year": 573,
      "title": "Birth",
      "description": "Event description"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "id": 10,
  "name": "Character Name",
  "arabic_name": "اسم الشخصية",
  "title": "Historical Title",
  "description": "Brief description",
  "category": "الصحابة",
  "era": "الخلافة الراشدة",
  "slug": "character-name",
  "created_at": "2024-01-01T12:00:00Z",
  "message": "Character created successfully"
}
```

**Error Responses:**

400 Bad Request:
```json
{
  "detail": "Validation error",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789",
  "details": {
    "field": "category",
    "message": "Invalid category value"
  }
}
```

401 Unauthorized:
```json
{
  "detail": "Authentication required",
  "error_code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789"
}
```

### Content API

#### GET /api/content/categories

Get all available character categories.

**Success Response (200):**
```json
[
  "الأنبياء",
  "الصحابة",
  "التابعون",
  "العلماء",
  "النساء الصالحات",
  "القادة"
]
```

#### GET /api/content/eras

Get all historical eras.

**Success Response (200):**
```json
[
  "ما قبل الإسلام",
  "عصر النبوة",
  "الخلافة الراشدة",
  "الدولة الأموية",
  "الدولة العباسية",
  "الدولة العثمانية"
]
```

#### GET /api/content/search

Search across character data with advanced filtering.

**Request Parameters:**
- `q` (string, required): Search query
- `category` (string, optional): Filter by category
- `era` (string, optional): Filter by era
- `limit` (int, optional): Maximum results (default: 20, max: 100)
- `offset` (int, optional): Results offset (default: 0, min: 0)

**Example Request:**
```http
GET /api/content/search?q=خليفة&category=الصحابة&limit=5
```

**Success Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "name": "Umar ibn al-Khattab",
      "arabic_name": "عمر بن الخطاب",
      "title": "The Second Caliph",
      "description": "The second caliph...",
      "category": "الصحابة",
      "era": "الخلافة الراشدة",
      "slug": "umar-ibn-al-khattab",
      "profile_image": "/static/images/umar.jpg",
      "views_count": 1500
    }
  ],
  "total": 15,
  "offset": 0,
  "limit": 5
}
```

### Authentication API

#### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "full_name": "User Name",
    "is_active": true,
    "language": "ar",
    "theme": "light"
  }
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "detail": "Invalid credentials",
  "error_code": "INVALID_CREDENTIALS",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789"
}
```

422 Validation Error:
```json
{
  "detail": "Username and password are required",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req_123456789",
  "details": {
    "username": "Field required",
    "password": "Field required"
  }
}
```

## Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_PARAMETER` | 400 | Invalid parameter value |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid username/password |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `CHARACTER_NOT_FOUND` | 404 | Character not found |
| `USER_NOT_FOUND` | 404 | User not found |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Unauthenticated requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **Search endpoints**: 200 requests per hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination using `page` and `limit` parameters:

- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 12, max: 100)

Pagination metadata is included in list responses:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 150,
    "pages": 13,
    "has_next": true,
    "has_prev": false
  }
}
```

## Caching

Some endpoints use caching to improve performance:

- **Character details**: 10 minutes
- **Featured content**: 5 minutes
- **Categories/Eras**: 1 hour
- **Search results**: 2 minutes

Cache headers are included:
```http
Cache-Control: public, max-age=600
ETag: "abc123"
Last-Modified: "Mon, 01 Jan 2024 12:00:00 GMT"
```

## Testing API Endpoints

### Using curl

```bash
# Get characters
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/characters"

# Get specific character
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/characters/abu-bakr"

# Search characters
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/content/search?q=خليفة"

# Login
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"username":"user@example.com","password":"password"}' \
     "http://localhost:8000/api/auth/login"
```

### Using Python requests

```python
import requests

# Get characters with authentication
headers = {"Authorization": "Bearer <token>"}
response = requests.get(
    "http://localhost:8000/api/characters",
    headers=headers,
    params={"page": 1, "limit": 10, "category": "الصحابة"}
)

if response.status_code == 200:
    characters = response.json()
    print(f"Found {len(characters)} characters")
else:
    print(f"Error: {response.status_code} - {response.json()}")
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class IslamicCharactersAPI {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async getCharacters(options: {
    page?: number;
    limit?: number;
    category?: string;
    era?: string;
    sort?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(options.page || 1),
      limit: String(options.limit || 12),
      ...(options.category && { category: options.category }),
      ...(options.era && { era: options.era }),
      ...(options.sort && { sort: options.sort })
    });

    const response = await fetch(
      `${this.baseURL}/characters?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getCharacter(id: string | number) {
    const response = await fetch(
      `${this.baseURL}/characters/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const api = new IslamicCharactersAPI(
  'http://localhost:8000/api',
  'your-jwt-token'
);

const characters = await api.getCharacters({
  category: 'الصحابة',
  sort: 'views',
  limit: 10
});

const abuBakr = await api.getCharacter('abu-bakr');
```

## WebSocket Support

Real-time updates are available through WebSocket connections:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

## OpenAPI Specification

The complete API specification is available at:
- **Swagger UI**: `/api/docs`
- **ReDoc**: `/api/redoc`
- **OpenAPI JSON**: `/api/openapi.json`

## Support

For API support and questions:
- Create an issue on GitHub
- Email: api-support@on-their-footsteps.com
- Documentation: https://docs.on-their-footsteps.com/api
