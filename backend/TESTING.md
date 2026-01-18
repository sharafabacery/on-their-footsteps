# 🧪 Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the Islamic Characters platform backend, including unit tests, integration tests, API tests, and performance testing.

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \     <- End-to-End Tests (10%)
     /______\
    /        \
   /Integration\ <- Integration Tests (20%)
  /__________\
 /            \
/   Unit Tests  \   <- Unit Tests (70%)
/______________\
```

### Test Categories

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test component interactions
3. **API Tests**: Test HTTP endpoints
4. **Performance Tests**: Test system performance
5. **Security Tests**: Test security vulnerabilities

## Testing Framework Setup

### Dependencies

```bash
# Testing dependencies
pip install pytest pytest-asyncio pytest-cov httpx
pip install pytest-mock pytest-env factory-boy
pip install faker sqlalchemy-faker
```

### Configuration

`pytest.ini`:
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --verbose
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    slow: Slow running tests
    external: Tests requiring external services
```

`conftest.py`:
```python
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.config import settings

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def sample_character_data():
    """Sample character data for testing."""
    return {
        "name": "Test Character",
        "arabic_name": "شخصية اختبار",
        "title": "Test Title",
        "description": "Test description",
        "category": "الصحابة",
        "era": "الخلافة الراشدة",
        "birth_year": 573,
        "death_year": 634,
        "full_story": "This is a test story...",
        "key_achievements": ["Achievement 1", "Achievement 2"],
        "lessons": ["Lesson 1", "Lesson 2"],
        "quotes": ["Quote 1", "Quote 2"],
        "timeline_events": [
            {
                "year": 573,
                "title": "Birth",
                "description": "Test birth event"
            }
        ]
    }
```

## Unit Tests

### Model Tests

`tests/test_models.py`:
```python
import pytest
from app.models import IslamicCharacter, User
from datetime import datetime

class TestIslamicCharacter:
    """Test IslamicCharacter model."""
    
    def test_character_creation(self, db_session):
        """Test creating a character record."""
        character = IslamicCharacter(
            name="Test Character",
            arabic_name="شخصية اختبار",
            category="الصحابة",
            era="الخلافة الراشدة"
        )
        db_session.add(character)
        db_session.commit()
        
        assert character.id is not None
        assert character.name == "Test Character"
        assert character.arabic_name == "شخصية اختبار"
        assert character.views_count == 0
        assert character.likes_count == 0
        assert character.is_featured is False
    
    def test_character_with_json_fields(self, db_session):
        """Test character with JSON fields."""
        character = IslamicCharacter(
            name="Test Character",
            arabic_name="شخصية اختبار",
            category="الصحابة",
            era="الخلافة الراشدة",
            key_achievements=["Achievement 1", "Achievement 2"],
            lessons=["Lesson 1"],
            timeline_events=[{"year": 573, "title": "Birth"}]
        )
        db_session.add(character)
        db_session.commit()
        
        assert len(character.key_achievements) == 2
        assert character.key_achievements[0] == "Achievement 1"
        assert len(character.lessons) == 1
        assert character.timeline_events[0]["year"] == 573
    
    def test_character_slug_generation(self, db_session):
        """Test automatic slug generation."""
        character = IslamicCharacter(
            name="Test Character",
            arabic_name="شخصية اختبار",
            category="الصحابة",
            era="الخلافة الراشدة"
        )
        db_session.add(character)
        db_session.commit()
        
        assert character.slug is not None
        assert isinstance(character.slug, str)
        assert len(character.slug) > 0

class TestUser:
    """Test User model."""
    
    def test_user_creation(self, db_session):
        """Test creating a user record."""
        user = User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password="hashed_password"
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.is_active is True
        assert user.language == "ar"
        assert user.theme == "light"
```

### Schema Tests

`tests/test_schemas.py`:
```python
import pytest
from pydantic import ValidationError
from app.schemas import CharacterCreate, CharacterResponse, CategoryEnum, EraEnum

class TestCharacterSchemas:
    """Test Pydantic schemas."""
    
    def test_character_create_valid(self, sample_character_data):
        """Test valid CharacterCreate schema."""
        character = CharacterCreate(**sample_character_data)
        assert character.name == "Test Character"
        assert character.arabic_name == "شخصية اختبار"
        assert character.category == CategoryEnum.الصحابة
        assert character.era == EraEnum.الخلافة_الراشدة
    
    def test_character_create_invalid_category(self, sample_character_data):
        """Test invalid category in CharacterCreate."""
        sample_character_data["category"] = "Invalid Category"
        with pytest.raises(ValidationError):
            CharacterCreate(**sample_character_data)
    
    def test_character_create_missing_required(self):
        """Test missing required fields in CharacterCreate."""
        with pytest.raises(ValidationError) as exc_info:
            CharacterCreate(name="Test")
        
        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "arabic_name" in error_fields
        assert "category" in error_fields
        assert "era" in error_fields
    
    def test_character_response_from_model(self, db_session, sample_character_data):
        """Test CharacterResponse from database model."""
        from app.models import IslamicCharacter
        
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        db_session.refresh(character)
        
        response = CharacterResponse.model_validate(character)
        assert response.id == character.id
        assert response.name == character.name
        assert response.arabic_name == character.arabic_name

class TestEnums:
    """Test enum schemas."""
    
    def test_category_enum_values(self):
        """Test CategoryEnum has correct values."""
        assert CategoryEnum.PROPHETS == "الأنبياء"
        assert CategoryEnum.COMPANIONS == "الصحابة"
        assert CategoryEnum.FOLLOWERS == "التابعون"
        assert CategoryEnum.SCHOLARS == "العلماء"
        assert CategoryEnum.WOMEN == "النساء الصالحات"
        assert CategoryEnum.LEADERS == "القادة"
    
    def test_era_enum_values(self):
        """Test EraEnum has correct values."""
        assert EraEnum.PRE_ISLAM == "ما قبل الإسلام"
        assert EraEnum.PROPHET_ERA == "عصر النبوة"
        assert EraEnum.RIGHTLY_GUIDED == "الخلافة الراشدة"
        assert EraEnum.UMAYYAD == "الدولة الأموية"
        assert EraEnum.ABBASID == "الدولة العباسية"
        assert EraEnum.OTTOMAN == "الدولة العثمانية"
```

### Utility Tests

`tests/test_utils.py`:
```python
import pytest
from app.utils.validators import validate_character_data, sanitize_search_query
from app.utils.helpers import generate_slug, calculate_reading_time

class TestValidators:
    """Test utility validators."""
    
    def test_validate_character_data_valid(self, sample_character_data):
        """Test valid character data validation."""
        is_valid, errors = validate_character_data(sample_character_data)
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_character_data_invalid(self):
        """Test invalid character data validation."""
        invalid_data = {
            "name": "",  # Empty name
            "arabic_name": "شخصية اختبار",
            "category": "الصحابة",
            "era": "الخلافة الراشدة"
        }
        
        is_valid, errors = validate_character_data(invalid_data)
        assert is_valid is False
        assert "name" in errors
        assert errors["name"] == "Name cannot be empty"
    
    def test_sanitize_search_query(self):
        """Test search query sanitization."""
        assert sanitize_search_query("normal query") == "normal query"
        assert sanitize_search_query("query; DROP TABLE users") == "query DROP TABLE users"
        assert sanitize_search_query("  spaced  query  ") == "spaced query"
        assert sanitize_search_query("") == ""

class TestHelpers:
    """Test utility helpers."""
    
    def test_generate_slug(self):
        """Test slug generation."""
        assert generate_slug("Test Character") == "test-character"
        assert generate_slug("أبو بكر") == "abu-bakr"
        assert generate_slug("Character With Spaces") == "character-with-spaces"
        assert generate_slug("Special!@#$%^&*()Characters") == "special-characters"
    
    def test_calculate_reading_time(self):
        """Test reading time calculation."""
        # Average reading speed: 200 words per minute
        text_200_words = "word " * 200
        assert calculate_reading_time(text_200_words) == 1
        
        text_400_words = "word " * 400
        assert calculate_reading_time(text_400_words) == 2
        
        assert calculate_reading_time("") == 0
        assert calculate_reading_time("short") == 1  # Minimum 1 minute
```

## Integration Tests

### Database Integration Tests

`tests/test_database_integration.py`:
```python
import pytest
from app.database import get_db
from app.models import IslamicCharacter, User, UserProgress
from sqlalchemy.orm import Session

class TestDatabaseIntegration:
    """Test database operations and relationships."""
    
    def test_user_progress_relationship(self, db_session):
        """Test user and progress relationship."""
        # Create user
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password"
        )
        db_session.add(user)
        db_session.flush()
        
        # Create character
        character = IslamicCharacter(
            name="Test Character",
            arabic_name="شخصية اختبار",
            category="الصحابة",
            era="الخلافة الراشدة"
        )
        db_session.add(character)
        db_session.flush()
        
        # Create progress record
        progress = UserProgress(
            user_id=user.id,
            character_id=character.id,
            completion_percentage=50.0
        )
        db_session.add(progress)
        db_session.commit()
        
        # Test relationships
        assert progress.user.id == user.id
        assert progress.character.id == character.id
        assert len(user.progress_records) == 1
        assert user.progress_records[0].completion_percentage == 50.0
    
    def test_database_transaction_rollback(self, db_session):
        """Test transaction rollback on error."""
        initial_count = db_session.query(IslamicCharacter).count()
        
        try:
            character = IslamicCharacter(
                name="Test Character",
                arabic_name="شخصية اختبار",
                category="الصحابة",
                era="الخلافة الراشدة"
            )
            db_session.add(character)
            
            # Force an error
            character.name = None  # This will violate NOT NULL constraint
            db_session.commit()
        except Exception:
            db_session.rollback()
        
        final_count = db_session.query(IslamicCharacter).count()
        assert initial_count == final_count
```

### Cache Integration Tests

`tests/test_cache_integration.py`:
```python
import pytest
from unittest.mock import Mock, patch
from app.cache import cache_result, CharacterCache
from app.models import IslamicCharacter

class TestCacheIntegration:
    """Test caching functionality."""
    
    @pytest.mark.asyncio
    async def test_cache_result_decorator(self):
        """Test cache result decorator."""
        call_count = 0
        
        @cache_result(expire=60, key_prefix="test")
        async def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # First call should execute function
        result1 = await expensive_function(5)
        assert result1 == 10
        assert call_count == 1
        
        # Second call should use cache
        result2 = await expensive_function(5)
        assert result2 == 10
        assert call_count == 1  # Should not increase
        
        # Different parameter should execute function
        result3 = await expensive_function(10)
        assert result3 == 20
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_character_cache(self):
        """Test CharacterCache operations."""
        with patch('app.cache.redis_client') as mock_redis:
            mock_redis.get.return_value = None
            mock_redis.set.return_value = True
            
            cache = CharacterCache()
            
            # Test cache miss
            result = await cache.get("test-key")
            assert result is None
            mock_redis.get.assert_called_once_with("character:test-key")
            
            # Test cache set
            await cache.set("test-key", {"id": 1, "name": "Test"})
            mock_redis.set.assert_called_once()
            
            # Test cache invalidate
            await cache.invalidate("test-key")
            mock_redis.delete.assert_called_once_with("character:test-key")
```

## API Tests

### Character API Tests

`tests/test_characters_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from app.models import IslamicCharacter

class TestCharactersAPI:
    """Test characters API endpoints."""
    
    def test_get_characters_empty(self, client):
        """Test getting characters when database is empty."""
        response = client.get("/api/characters")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_characters_with_data(self, client, db_session, sample_character_data):
        """Test getting characters with data."""
        # Create test character
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        
        response = client.get("/api/characters")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Character"
        assert data[0]["arabic_name"] == "شخصية اختبار"
    
    def test_get_characters_pagination(self, client, db_session):
        """Test character pagination."""
        # Create multiple characters
        for i in range(15):
            character = IslamicCharacter(
                name=f"Character {i}",
                arabic_name=f"شخصية {i}",
                category="الصحابة",
                era="الخلافة الراشدة"
            )
            db_session.add(character)
        db_session.commit()
        
        # Test first page
        response = client.get("/api/characters?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        
        # Test second page
        response = client.get("/api/characters?page=2&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
    
    def test_get_characters_filtering(self, client, db_session):
        """Test character filtering."""
        # Create characters with different categories
        categories = ["الصحابة", "الأنبياء", "العلماء"]
        for i, category in enumerate(categories):
            character = IslamicCharacter(
                name=f"Character {i}",
                arabic_name=f"شخصية {i}",
                category=category,
                era="الخلافة الراشدة"
            )
            db_session.add(character)
        db_session.commit()
        
        # Test category filter
        response = client.get("/api/characters?category=الصحابة")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category"] == "الصحابة"
    
    def test_get_character_by_id(self, client, db_session, sample_character_data):
        """Test getting character by ID."""
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        
        response = client.get(f"/api/characters/{character.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == character.id
        assert data["name"] == "Test Character"
        assert data["arabic_name"] == "شخصية اختبار"
    
    def test_get_character_by_slug(self, client, db_session, sample_character_data):
        """Test getting character by slug."""
        sample_character_data["slug"] = "test-character"
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        
        response = client.get("/api/characters/test-character")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "test-character"
        assert data["name"] == "Test Character"
    
    def test_get_character_not_found(self, client):
        """Test getting non-existent character."""
        response = client.get("/api/characters/99999")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "CHARACTER_NOT_FOUND" in str(data)
    
    def test_create_character(self, client, sample_character_data):
        """Test creating a new character."""
        response = client.post("/api/characters", json=sample_character_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Character"
        assert data["arabic_name"] == "شخصية اختبار"
    
    def test_create_character_invalid_data(self, client):
        """Test creating character with invalid data."""
        invalid_data = {
            "name": "",  # Invalid: empty name
            "arabic_name": "شخصية اختبار",
            "category": "الصحابة",
            "era": "الخلافة الراشدة"
        }
        
        response = client.post("/api/characters", json=invalid_data)
        assert response.status_code == 422
        
        data = response.json()
        assert "detail" in data
    
    def test_update_character(self, client, db_session, sample_character_data):
        """Test updating an existing character."""
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        
        update_data = {
            "name": "Updated Character",
            "description": "Updated description"
        }
        
        response = client.put(f"/api/characters/{character.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Character"
        assert data["description"] == "Updated description"
    
    def test_delete_character(self, client, db_session, sample_character_data):
        """Test deleting a character."""
        character = IslamicCharacter(**sample_character_data)
        db_session.add(character)
        db_session.commit()
        
        response = client.delete(f"/api/characters/{character.id}")
        assert response.status_code == 200
        
        # Verify character is deleted
        response = client.get(f"/api/characters/{character.id}")
        assert response.status_code == 404
```

### Authentication API Tests

`tests/test_auth_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from app.models import User
from app.security import create_access_token, verify_password, get_password_hash

class TestAuthAPI:
    """Test authentication API endpoints."""
    
    def test_login_success(self, client, db_session):
        """Test successful login."""
        # Create test user
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User"
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "username": "testuser",
            "password": "password123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "testuser"
    
    def test_login_invalid_credentials(self, client, db_session):
        """Test login with invalid credentials."""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User"
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        
        data = response.json()
        assert "detail" in data
        assert "INVALID_CREDENTIALS" in str(data)
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        login_data = {
            "username": "nonexistent",
            "password": "password123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
    
    def test_protected_endpoint_with_token(self, client, db_session):
        """Test accessing protected endpoint with valid token."""
        # Create test user
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User"
        )
        db_session.add(user)
        db_session.commit()
        
        # Login to get token
        login_data = {
            "username": "testuser",
            "password": "password123"
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Access protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
```

## Performance Tests

### Load Testing

`tests/test_performance.py`:
```python
import pytest
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

class TestPerformance:
    """Test API performance under load."""
    
    @pytest.mark.slow
    def test_concurrent_character_requests(self, client, db_session):
        """Test handling concurrent character requests."""
        # Create test data
        for i in range(10):
            character = IslamicCharacter(
                name=f"Character {i}",
                arabic_name=f"شخصية {i}",
                category="الصحابة",
                era="الخلافة الراشدة"
            )
            db_session.add(character)
        db_session.commit()
        
        def make_request():
            start_time = time.time()
            response = client.get("/api/characters")
            end_time = time.time()
            return response.status_code, end_time - start_time
        
        # Run concurrent requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(50)]
            results = [future.result() for future in futures]
        
        # Analyze results
        successful_requests = [r for r in results if r[0] == 200]
        response_times = [r[1] for r in successful_requests]
        
        assert len(successful_requests) >= 45  # At least 90% success rate
        assert max(response_times) < 2.0  # Max response time under 2 seconds
        assert sum(response_times) / len(response_times) < 0.5  # Average under 500ms
    
    @pytest.mark.slow
    def test_search_performance(self, client, db_session):
        """Test search endpoint performance."""
        # Create test data
        for i in range(100):
            character = IslamicCharacter(
                name=f"Character {i}",
                arabic_name=f"شخصية {i}",
                category="الصحابة",
                era="الخلافة الراشدة",
                description=f"Description for character {i} with searchable content"
            )
            db_session.add(character)
        db_session.commit()
        
        start_time = time.time()
        response = client.get("/api/content/search?q=Character")
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 1.0  # Search should complete within 1 second
        
        data = response.json()
        assert len(data["results"]) > 0
    
    @pytest.mark.slow
    def test_pagination_performance(self, client, db_session):
        """Test pagination with large datasets."""
        # Create large dataset
        for i in range(1000):
            character = IslamicCharacter(
                name=f"Character {i}",
                arabic_name=f"شخصية {i}",
                category="الصحابة",
                era="الخلافة الراشدة"
            )
            db_session.add(character)
        db_session.commit()
        
        # Test different page sizes
        page_sizes = [10, 50, 100]
        for page_size in page_sizes:
            start_time = time.time()
            response = client.get(f"/api/characters?limit={page_size}")
            end_time = time.time()
            
            assert response.status_code == 200
            assert end_time - start_time < 0.5  # Each page should load within 500ms
            
            data = response.json()
            assert len(data) == page_size
```

## Security Tests

### Input Validation Tests

`tests/test_security.py`:
```python
import pytest
from fastapi.testclient import TestClient

class TestSecurity:
    """Test security vulnerabilities and input validation."""
    
    def test_sql_injection_attempts(self, client):
        """Test SQL injection attempts."""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; INSERT INTO users VALUES ('hacker', 'password'); --",
            "'; UPDATE users SET password='hacked'; --"
        ]
        
        for malicious_input in malicious_inputs:
            response = client.get(f"/api/characters?search={malicious_input}")
            # Should not cause server error
            assert response.status_code in [200, 404, 422]
    
    def test_xss_attempts(self, client, db_session, sample_character_data):
        """Test XSS attempts in character data."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            sample_character_data["name"] = payload
            response = client.post("/api/characters", json=sample_character_data)
            
            if response.status_code == 201:
                # Verify XSS is sanitized in response
                data = response.json()
                assert "<script>" not in data["name"]
                assert "javascript:" not in data["name"]
    
    def test_rate_limiting(self, client):
        """Test rate limiting functionality."""
        # Make multiple rapid requests
        responses = []
        for _ in range(100):
            response = client.get("/api/characters")
            responses.append(response.status_code)
        
        # Should have some rate limited responses
        rate_limited_count = responses.count(429)
        assert rate_limited_count > 0
        
        # Verify rate limit headers
        rate_limited_response = next(r for r in responses if r == 429)
        assert "X-RateLimit-Limit" in rate_limited_response.headers
        assert "X-RateLimit-Remaining" in rate_limited_response.headers
    
    def test_authentication_bypass_attempts(self, client):
        """Test authentication bypass attempts."""
        # Test various malformed tokens
        malformed_tokens = [
            "invalid.token.here",
            "Bearer",
            "",
            "null",
            "undefined",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"
        ]
        
        for token in malformed_tokens:
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/auth/me", headers=headers)
            assert response.status_code == 401
```

## Test Data Management

### Factory Pattern

`tests/factories.py`:
```python
import factory
from faker import Faker
from app.models import IslamicCharacter, User, UserProgress

fake = Faker()

class UserFactory(factory.Factory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
    
    username = factory.LazyAttribute(lambda obj: fake.user_name())
    email = factory.LazyAttribute(lambda obj: fake.email())
    full_name = factory.LazyAttribute(lambda obj: fake.name())
    hashed_password = factory.LazyAttribute(lambda obj: "hashed_password")
    is_active = True
    language = "ar"
    theme = "light"

class IslamicCharacterFactory(factory.Factory):
    """Factory for creating IslamicCharacter instances."""
    
    class Meta:
        model = IslamicCharacter
    
    name = factory.LazyAttribute(lambda obj: fake.name())
    arabic_name = factory.LazyAttribute(lambda obj: fake.name())
    english_name = factory.LazyAttribute(lambda obj: fake.name())
    title = factory.LazyAttribute(lambda obj: fake.job())
    description = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=200))
    category = factory.Iterator(["الصحابة", "الأنبياء", "العلماء"])
    era = factory.Iterator(["عصر النبوة", "الخلافة الراشدة", "الدولة الأموية"])
    birth_year = factory.LazyAttribute(lambda obj: fake.random_int(min=500, max=1500))
    death_year = factory.LazyAttribute(lambda obj: fake.random_int(min=600, max=1600))
    views_count = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=10000))
    likes_count = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=1000))
    shares_count = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=500))
    is_featured = factory.Faker('boolean')
    is_verified = True

class UserProgressFactory(factory.Factory):
    """Factory for creating UserProgress instances."""
    
    class Meta:
        model = UserProgress
    
    completion_percentage = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=100))
    viewed_content = factory.LazyAttribute(lambda obj: {"chapters": [1, 2, 3]})
    bookmarks = factory.LazyAttribute(lambda obj: {"pages": [1, 5, 10]})
    notes = factory.LazyAttribute(lambda obj: {"page_1": "Important note"})
```

## Continuous Integration

### GitHub Actions Workflow

`.github/workflows/test.yml`:
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov pytest-asyncio httpx
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        SECRET_KEY: test-secret-key
      run: |
        pytest --cov=app --cov-report=xml --cov-report=html
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

## Test Execution

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test categories
pytest -m unit
pytest -m integration
pytest -m api

# Run specific test file
pytest tests/test_characters_api.py

# Run with verbose output
pytest -v

# Run with specific markers
pytest -m "not slow"  # Skip slow tests
pytest -m "unit or integration"  # Run unit and integration tests
```

### Coverage Reports

```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html

# Generate coverage badge
pytest --cov=app --cov-report=term-missing
```

## Best Practices

### Test Organization

1. **Separate test types** in different files
2. **Use descriptive test names** that explain what's being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Use fixtures** for common test setup
5. **Mock external dependencies** to isolate tests

### Test Data

1. **Use factories** for creating test data
2. **Clean up test data** after each test
3. **Use realistic data** that matches production
4. **Test edge cases** and boundary conditions

### Performance Testing

1. **Test with realistic data volumes**
2. **Monitor resource usage** during tests
3. **Set performance benchmarks**
4. **Test concurrent operations**

This comprehensive testing strategy ensures the reliability, security, and performance of the Islamic Characters platform backend.
