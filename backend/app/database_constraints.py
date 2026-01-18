"""
Database constraints and data integrity utilities.
Provides database constraint definitions and validation functions.
"""

from sqlalchemy import text, CheckConstraint, Index
from sqlalchemy.orm import Session
from .models import IslamicCharacter
from .logging_config import get_logger
import re

logger = get_logger(__name__)

class DatabaseConstraints:
    """Database constraint definitions and validation."""
    
    @staticmethod
    def get_character_constraints():
        """Get all character model constraints."""
        return [
            # Year constraints
            CheckConstraint(
                'birth_year >= 500 AND birth_year <= 2024',
                name='valid_birth_year'
            ),
            CheckConstraint(
                'death_year >= 500 AND death_year <= 2024',
                name='valid_death_year'
            ),
            CheckConstraint(
                'death_year IS NULL OR death_year >= birth_year',
                name='death_after_birth'
            ),
            
            # View count constraints
            CheckConstraint(
                'views_count >= 0',
                name='non_negative_views'
            ),
            CheckConstraint(
                'likes_count >= 0',
                name='non_negative_likes'
            ),
            CheckConstraint(
                'shares_count >= 0',
                name='non_negative_shares'
            ),
            
            # Name constraints
            CheckConstraint(
                "length(name) >= 2 AND length(name) <= 200",
                name='valid_name_length'
            ),
            CheckConstraint(
                "length(arabic_name) >= 2 AND length(arabic_name) <= 200",
                name='valid_arabic_name_length'
            ),
            CheckConstraint(
                "name ~ '^[a-zA-Z\\s\\u0600-\\u06FF\\-]+$'",
                name='valid_name_characters'
            ),
            CheckConstraint(
                "arabic_name ~ '^[\\u0600-\\u06FF\\s\\-]+$'",
                name='valid_arabic_name_characters'
            ),
            
            # Category constraints
            CheckConstraint(
                "category IN ('الأنبياء', 'الصحابة', 'التابعون', 'العلماء', 'النساء الصالحات', 'القادة')",
                name='valid_category'
            ),
            CheckConstraint(
                "era IN ('ما قبل الإسلام', 'عصر النبوة', 'الخلافة الراشدة', 'الدولة الأموية', 'الدولة العباسية', 'الدولة العثمانية')",
                name='valid_era'
            ),
            
            # URL slug constraints
            CheckConstraint(
                "slug ~ '^[a-z0-9-]+$'",
                name='valid_slug_format'
            ),
            CheckConstraint(
                "length(slug) >= 3 AND length(slug) <= 200",
                name='valid_slug_length'
            ),
        ]
    
    @staticmethod
    def get_character_indexes():
        """Get optimized indexes for character model."""
        return [
            # Primary indexes (already in model)
            Index('idx_characters_id', 'islamic_characters.id', unique=True),
            Index('idx_characters_slug', 'islamic_characters.slug', unique=True),
            
            # Search indexes
            Index('idx_characters_name', 'islamic_characters.name'),
            Index('idx_characters_arabic_name', 'islamic_characters.arabic_name'),
            Index('idx_characters_search', 'text', 
                  "to_tsvector('arabic', name || ' ' || arabic_name || ' ' || description)"),
            
            # Filter indexes
            Index('idx_characters_category', 'islamic_characters.category'),
            Index('idx_characters_era', 'islamic_characters.era'),
            Index('idx_characters_category_era', 'islamic_characters.category', 'islamic_characters.era'),
            Index('idx_characters_featured', 'islamic_characters.is_featured'),
            Index('idx_characters_verified', 'islamic_character.is_verified'),
            
            # Performance indexes
            Index('idx_characters_views_desc', 'islamic_characters.views_count.desc()'),
            Index('idx_characters_likes_desc', 'islamic_characters.likes_count.desc()'),
            Index('idx_characters_created_desc', 'islamic_characters.created_at.desc()'),
            Index('idx_characters_updated_desc', 'islamic_characters.updated_at.desc()'),
            
            # Composite indexes for common queries
            Index('idx_characters_category_views', 'islamic_characters.category', 'islamic_characters.views_count.desc()'),
            Index('idx_characters_era_views', 'islamic_characters.era', 'islamic_characters.views_count.desc()'),
            Index('idx_characters_featured_views', 'islamic_characters.is_featured', 'islamic_characters.views_count.desc()'),
        ]
    
    @staticmethod
    def validate_character_data(character_data: dict) -> dict:
        """
        Validate character data before database operations.
        
        Args:
            character_data: Dictionary containing character data
            
        Returns:
            Validated character data with error information
            
        Raises:
            ValueError: If data validation fails
        """
        errors = []
        validated_data = character_data.copy()
        
        # Validate year fields
        if 'birth_year' in character_data and character_data['birth_year'] is not None:
            birth_year = character_data['birth_year']
            if not (500 <= birth_year <= 2024):
                errors.append("Birth year must be between 500 and 2024")
            validated_data['birth_year'] = birth_year
        
        if 'death_year' in character_data and character_data['death_year'] is not None:
            death_year = character_data['death_year']
            if not (500 <= death_year <= 2024):
                errors.append("Death year must be between 500 and 2024")
            validated_data['death_year'] = death_year
            
            # Check death year against birth year
            if 'birth_year' in validated_data and validated_data['birth_year'] is not None:
                if death_year < validated_data['birth_year']:
                    errors.append("Death year must be after birth year")
        
        # Validate counts
        for field in ['views_count', 'likes_count', 'shares_count']:
            if field in character_data and character_data[field] is not None:
                count = character_data[field]
                if count < 0:
                    errors.append(f"{field.replace('_', ' ').title()} must be non-negative")
                validated_data[field] = max(0, count)
        
        # Validate names
        if 'name' in character_data:
            name = character_data['name']
            if not name or len(name.strip()) < 2:
                errors.append("Name must be at least 2 characters long")
            elif len(name) > 200:
                errors.append("Name cannot exceed 200 characters")
            elif not re.match(r'^[a-zA-Z\s\-\u0600-\u06FF]+$', name):
                errors.append("Name can only contain letters, spaces, hyphens, and Arabic characters")
            validated_data['name'] = name.strip()
        
        if 'arabic_name' in character_data:
            arabic_name = character_data['arabic_name']
            if not arabic_name or len(arabic_name.strip()) < 2:
                errors.append("Arabic name must be at least 2 characters long")
            elif len(arabic_name) > 200:
                errors.append("Arabic name cannot exceed 200 characters")
            elif not re.match(r'^[\u0600-\u06FF\s-]+$', arabic_name):
                errors.append("Arabic name can only contain Arabic letters, spaces, and hyphens")
            validated_data['arabic_name'] = arabic_name.strip()
        
        # Validate category and era
        valid_categories = ['الأنبياء', 'الصحابة', 'التابعون', 'العلماء', 'النساء الصالحات', 'القادة']
        valid_eras = ['ما قبل الإسلام', 'عصر النبوة', 'الخلافة الراشدة', 'الدولة الأموية', 'الدولة العباسية', 'الدولة العثمانية']
        
        if 'category' in character_data and character_data['category'] not in valid_categories:
            errors.append(f"Category must be one of: {', '.join(valid_categories)}")
        
        if 'era' in character_data and character_data['era'] not in valid_eras:
            errors.append(f"Era must be one of: {', '.join(valid_eras)}")
        
        # Validate slug
        if 'slug' in character_data and character_data['slug']:
            slug = character_data['slug']
            if not slug or len(slug) < 3:
                errors.append("Slug must be at least 3 characters long")
            elif len(slug) > 200:
                errors.append("Slug cannot exceed 200 characters")
            elif not re.match(r'^[a-z0-9-]+$', slug):
                errors.append("Slug can only contain lowercase letters, numbers, and hyphens")
            validated_data['slug'] = slug.lower()
        
        # Validate URLs
        url_fields = ['profile_image', 'gallery', 'audio_stories', 'animations']
        for field in url_fields:
            if field in character_data and character_data[field]:
                value = character_data[field]
                if isinstance(value, str):
                    # Basic URL validation
                    if not (value.startswith('http://') or value.startswith('https://') or value.startswith('/')):
                        errors.append(f"{field.replace('_', ' ').title()} must be a valid URL")
                    validated_data[field] = value
                elif isinstance(value, list):
                    validated_list = []
                    for item in value:
                        if isinstance(item, str) and (item.startswith('http://') or item.startswith('https://') or item.startswith('/')):
                            validated_list.append(item)
                        else:
                            errors.append(f"Invalid URL in {field.replace('_', ' ').title()}")
                    validated_data[field] = validated_list
        
        # Validate JSON fields
        json_fields = ['key_achievements', 'lessons', 'quotes', 'timeline_events', 'locations', 'related_characters']
        for field in json_fields:
            if field in character_data and character_data[field] is not None:
                value = character_data[field]
                if not isinstance(value, (list, dict)):
                    errors.append(f"{field.replace('_', ' ').title()} must be a list or dictionary")
                else:
                    # Validate JSON structure
                    if field == 'timeline_events':
                        validated_list = []
                        for event in value:
                            if isinstance(event, dict) and 'year' in event and 'title' in event:
                                if not isinstance(event['year'], int) or not (500 <= event['year'] <= 2024):
                                    errors.append(f"Invalid year in timeline event: {event.get('year')}")
                                validated_list.append(event)
                            else:
                                errors.append("Timeline events must have 'year' and 'title' fields")
                        validated_data[field] = validated_list
                    elif field in ['key_achievements', 'lessons', 'quotes']:
                        if isinstance(value, list):
                            validated_list = []
                            for item in value:
                                if isinstance(item, str) and len(item.strip()) > 0:
                                    validated_list.append(item.strip())
                                else:
                                    errors.append(f"{field.replace('_', ' ').title()} items must be non-empty strings")
                            validated_data[field] = validated_list
                    else:
                        validated_data[field] = value
        
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")
        
        return validated_data
    
    @staticmethod
    def apply_constraints_to_database(db: Session):
        """Apply constraints to existing database."""
        try:
            logger.info("Applying database constraints...")
            
            # Add constraints to character table
            constraints = DatabaseConstraints.get_character_constraints()
            
            for constraint in constraints:
                try:
                    db.execute(text(f"ALTER TABLE islamic_characters ADD CONSTRAINT {constraint}"))
                    logger.info(f"Added constraint: {constraint}")
                except Exception as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Failed to add constraint {constraint}: {e}")
            
            db.commit()
            logger.info("Database constraints applied successfully")
            
        except Exception as e:
            logger.error(f"Failed to apply database constraints: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def create_indexes(db: Session):
        """Create optimized indexes for better performance."""
        try:
            logger.info("Creating database indexes...")
            
            indexes = DatabaseConstraints.get_character_indexes()
            
            for index in indexes:
                try:
                    if isinstance(index, Index):
                        index_name = index.name
                        index_def = str(index.compile(dialect=db.bind.dialect))
                        db.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON islamic_characters {index_def}"))
                        logger.info(f"Created index: {index_name}")
                except Exception as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Failed to create index: {e}")
            
            db.commit()
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def analyze_database_performance(db: Session):
        """Analyze database performance and provide recommendations."""
        try:
            logger.info("Analyzing database performance...")
            
            # Get table statistics
            result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    null_frac,
                    avg_width,
                    correlation
                FROM pg_stats
                WHERE schemaname = 'public'
                AND tablename = 'islamic_characters'
                ORDER BY tablename, attname
            """))
            
            stats = result.fetchall()
            
            recommendations = []
            
            for stat in stats:
                column_name = stat[2]
                null_fraction = float(stat[4]) if stat[4] else 0
                avg_width = float(stat[5]) if stat[5] else 0
                
                # Check for unused columns
                if null_fraction > 0.9:
                    recommendations.append(f"Column '{column_name}' is {null_fraction:.1%} null - consider removing or defaulting")
                
                # Check for oversized columns
                if avg_width > 1000:
                    recommendations.append(f"Column '{column_name}' has average width {avg_width:.1f} - consider optimization")
                
                # Check for high cardinality columns without indexes
                if stat[3] > 1000 and column_name not in ['id', 'name', 'arabic_name', 'category', 'era', 'slug']:
                    recommendations.append(f"High cardinality column '{column_name}' ({stat[3]} distinct values) - consider indexing")
            
            # Get index usage statistics
            index_stats = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                AND tablename = 'islamic_characters'
                ORDER BY idx_scan DESC
            """))
            
            indexes = index_stats.fetchall()
            
            for index in indexes:
                index_name = index[2]
                scans = index[3]
                reads = index[4]
                
                if scans == 0 and reads == 0:
                    recommendations.append(f"Index '{index_name}' is unused - consider removing")
                elif scans > 0 and reads == 0:
                    recommendations.append(f"Index '{index_name}' is scanned but never used - check query patterns")
            
            logger.info(f"Database performance analysis complete. {len(recommendations)} recommendations found.")
            
            return {
                'column_stats': stats,
                'index_stats': indexes,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze database performance: {e}")
            return {'recommendations': ['Failed to analyze performance']}
    
    @staticmethod
    def cleanup_unused_data(db: Session):
        """Clean up unused or invalid data."""
        try:
            logger.info("Cleaning up unused data...")
            
            # Find and fix invalid character data
            invalid_characters = db.query(IslamicCharacter).filter(
                or_(
                    IslamicCharacter.birth_year < 500,
                    IslamicCharacter.birth_year > 2024,
                    IslamicCharacter.death_year < 500,
                    IslamicCharacter.death_year > 2024,
                    IslamicCharacter.views_count < 0,
                    IslamicCharacter.likes_count < 0,
                    IslamicCharacter.shares_count < 0
                )
            ).all()
            
            if invalid_characters:
                logger.warning(f"Found {len(invalid_characters)} invalid character records")
                
                # Fix invalid data
                for character in invalid_characters:
                    if character.birth_year < 500:
                        character.birth_year = 500
                    if character.birth_year > 2024:
                        character.birth_year = 2024
                    if character.death_year and character.death_year < 500:
                        character.death_year = 500
                    if character.death_year and character.death_year > 2024:
                        character.death_year = 2024
                    character.views_count = max(0, character.views_count)
                    character.likes_count = max(0, character.likes_count)
                    character.shares_count = max(0, character.shares_count)
                
                db.commit()
                logger.info(f"Fixed {len(invalid_characters)} invalid character records")
            
            # Remove duplicate slugs
            duplicate_slugs = db.execute(text("""
                SELECT slug, COUNT(*) as count
                FROM islamic_characters
                GROUP BY slug
                HAVING COUNT(*) > 1
            """)).fetchall()
            
            if duplicate_slugs:
                logger.warning(f"Found {len(duplicate_slugs)} duplicate slugs")
                
                for slug, count in duplicate_slugs:
                    # Keep the first occurrence, update others
                    duplicates = db.query(IslamicCharacter).filter(
                        IslamicCharacter.slug == slug
                    ).order_by(IslamicCharacter.id).offset(1).all()
                    
                    for duplicate in duplicates:
                        duplicate.slug = f"{duplicate.slug}-{duplicate.id}"
                
                db.commit()
                logger.info(f"Fixed {len(duplicate_slugs)} duplicate slug issues")
            
            logger.info("Data cleanup completed")
            
        except Exception as e:
            logger.error(f"Failed to cleanup data: {e}")
            db.rollback()
            raise


# Global constraint manager
constraint_manager = DatabaseConstraints()
