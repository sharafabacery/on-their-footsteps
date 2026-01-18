"""
Database query optimization utilities.
Provides optimized query patterns and performance monitoring.
"""

from sqlalchemy.orm import Session, joinedload, selectinload, subqueryload
from sqlalchemy import text, func, and_, or_
from sqlalchemy.sql import Select
from typing import List, Dict, Any, Optional, Type
from ..models import IslamicCharacter, UserProgress
from ..logging_config import get_logger
import time

logger = get_logger(__name__)

class QueryOptimizer:
    """Utility class for optimizing database queries."""
    
    @staticmethod
    def get_characters_with_relations(
        db: Session,
        page: int = 1,
        limit: int = 12,
        category: Optional[str] = None,
        era: Optional[str] = None,
        sort: str = "name"
    ) -> List[IslamicCharacter]:
        """
        Optimized query for fetching characters with eager loading.
        
        Uses selectinload for performance-critical relationships to avoid N+1 queries.
        """
        start_time = time.time()
        
        # Build base query with eager loading
        query = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        )
        
        # Apply filters
        if category:
            query = query.filter(IslamicCharacter.category == category)
        
        if era:
            query = query.filter(IslamicCharacter.era == era)
        
        # Apply sorting
        if sort == "name":
            query = query.order_by(IslamicCharacter.name.asc())
        elif sort == "views":
            query = query.order_by(IslamicCharacter.views_count.desc())
        elif sort == "likes":
            query = query.order_by(IslamicCharacter.likes_count.desc())
        elif sort == "created":
            query = query.order_by(IslamicCharacter.created_at.desc())
        elif sort == "updated":
            query = query.order_by(IslamicCharacter.updated_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        characters = query.all()
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized character query completed in {duration:.3f}s, returned {len(characters)} results")
        
        return characters
    
    @staticmethod
    def get_character_by_id_optimized(
        db: Session,
        character_id: int
    ) -> Optional[IslamicCharacter]:
        """
        Optimized query for fetching a single character with all relations.
        
        Uses joinedload for one-to-one relationships and selectinload for
        one-to-many relationships to minimize database round trips.
        """
        start_time = time.time()
        
        character = db.query(IslamicCharacter).options(
            joinedload(IslamicCharacter.progress_records),
            selectinload(IslamicCharacter.related_characters)
        ).filter(IslamicCharacter.id == character_id).first()
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized character detail query completed in {duration:.3f}s")
        
        return character
    
    @staticmethod
    def search_characters_optimized(
        db: Session,
        query: str,
        limit: int = 20,
        category: Optional[str] = None,
        era: Optional[str] = None
    ) -> List[IslamicCharacter]:
        """
        Optimized full-text search query for characters.
        
        Uses PostgreSQL's built-in full-text search capabilities for better performance.
        """
        start_time = time.time()
        
        # Build search query with full-text search
        search_query = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        )
        
        # Add full-text search condition
        search_condition = text("""
            to_tsvector('arabic', name || ' ' || arabic_name || ' ' || description) 
            @@ plainto_tsquery('arabic', :search_term)
        """)
        
        search_query = search_query.filter(search_condition).params(search_term=query)
        
        # Apply filters
        if category:
            search_query = search_query.filter(IslamicCharacter.category == category)
        
        if era:
            search_query = search_query.filter(IslamicCharacter.era == era)
        
        # Order by relevance and limit
        search_query = search_query.order_by(
            text("ts_rank(to_tsvector('arabic', name || ' ' || arabic_name || ' ' || description), plainto_tsquery('arabic', :search_term)) DESC")
        ).params(search_term=query).limit(limit)
        
        # Execute query
        characters = search_query.all()
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized search query completed in {duration:.3f}s, returned {len(characters)} results")
        
        return characters
    
    @staticmethod
    def get_featured_characters_optimized(
        db: Session,
        limit: int = 6,
        category: Optional[str] = None
    ) -> List[IslamicCharacter]:
        """
        Optimized query for fetching featured characters.
        
        Uses indexed columns and proper ordering for performance.
        """
        start_time = time.time()
        
        query = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        ).filter(IslamicCharacter.is_featured == True)
        
        if category:
            query = query.filter(IslamicCharacter.category == category)
        
        # Order by views_count (descending) for most popular featured content
        query = query.order_by(
            IslamicCharacter.views_count.desc(),
            IslamicCharacter.likes_count.desc()
        ).limit(limit)
        
        characters = query.all()
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized featured characters query completed in {duration:.3f}s")
        
        return characters
    
    @staticmethod
    def get_character_statistics_optimized(db: Session) -> Dict[str, Any]:
        """
        Optimized query for character statistics.
        
        Uses database aggregations for efficient statistics calculation.
        """
        start_time = time.time()
        
        # Get counts by category
        category_stats = db.query(
            IslamicCharacter.category,
            func.count(IslamicCharacter.id).label('count'),
            func.sum(IslamicCharacter.views_count).label('total_views'),
            func.sum(IslamicCharacter.likes_count).label('total_likes')
        ).group_by(IslamicCharacter.category).all()
        
        # Get counts by era
        era_stats = db.query(
            IslamicCharacter.era,
            func.count(IslamicCharacter.id).label('count'),
            func.sum(IslamicCharacter.views_count).label('total_views'),
            func.sum(IslamicCharacter.likes_count).label('total_likes')
        ).group_by(IslamicCharacter.era).all()
        
        # Get overall statistics
        total_stats = db.query(
            func.count(IslamicCharacter.id).label('total_characters'),
            func.sum(IslamicCharacter.views_count).label('total_views'),
            func.sum(IslamicCharacter.likes_count).label('total_likes'),
            func.avg(IslamicCharacter.views_count).label('avg_views'),
            func.avg(IslamicCharacter.likes_count).label('avg_likes')
        ).first()
        
        # Get most viewed characters
        most_viewed = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        ).order_by(IslamicCharacter.views_count.desc()).limit(10).all()
        
        # Get most liked characters
        most_liked = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        ).order_by(IslamicCharacter.likes_count.desc()).limit(10).all()
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized statistics query completed in {duration:.3f}s")
        
        return {
            'category_stats': [
                {
                    'category': stat.category,
                    'count': stat.count,
                    'total_views': stat.total_views or 0,
                    'total_likes': stat.total_likes or 0
                }
                for stat in category_stats
            ],
            'era_stats': [
                {
                    'era': stat.era,
                    'count': stat.count,
                    'total_views': stat.total_views or 0,
                    'total_likes': stat.total_likes or 0
                }
                for stat in era_stats
            ],
            'total_stats': {
                'total_characters': total_stats.total_characters or 0,
                'total_views': total_stats.total_views or 0,
                'total_likes': total_stats.total_likes or 0,
                'avg_views': float(total_stats.avg_views or 0),
                'avg_likes': float(total_stats.avg_likes or 0)
            },
            'most_viewed': [
                {
                    'id': char.id,
                    'name': char.name,
                    'arabic_name': char.arabic_name,
                    'views_count': char.views_count,
                    'category': char.category,
                    'era': char.era
                }
                for char in most_viewed
            ],
            'most_liked': [
                {
                    'id': char.id,
                    'name': char.name,
                    'arabic_name': char.arabic_name,
                    'likes_count': char.likes_count,
                    'category': char.category,
                    'era': char.era
                }
                for char in most_liked
            ]
        }
    
    @staticmethod
    def get_related_characters_optimized(
        db: Session,
        character_id: int,
        limit: int = 6
    ) -> List[IslamicCharacter]:
        """
        Optimized query for fetching related characters.
        
        Uses category and era-based recommendations for better performance.
        """
        start_time = time.time()
        
        # Get the character first
        character = db.query(IslamicCharacter).filter(IslamicCharacter.id == character_id).first()
        if not character:
            return []
        
        # Find characters in the same category and era
        related_query = db.query(IslamicCharacter).options(
            selectinload(IslamicCharacter.progress_records)
        ).filter(
            and_(
                IslamicCharacter.id != character_id,
                IslamicCharacter.category == character.category,
                IslamicCharacter.era == character.era
            )
        ).order_by(
            IslamicCharacter.views_count.desc(),
            IslamicCharacter.likes_count.desc()
        ).limit(limit)
        
        related_characters = related_query.all()
        
        # If we don't have enough related characters, get more from same category
        if len(related_characters) < limit:
            additional_query = db.query(IslamicCharacter).options(
                selectinload(IslamicCharacter.progress_records)
            ).filter(
                and_(
                    IslamicCharacter.id != character_id,
                    IslamicCharacter.category == character.category,
                    IslamicCharacter.id.notin([char.id for char in related_characters])
                )
            ).order_by(
                IslamicCharacter.views_count.desc(),
                IslamicCharacter.likes_count.desc()
            ).limit(limit - len(related_characters))
            
            additional_characters = additional_query.all()
            related_characters.extend(additional_characters)
        
        # Log performance
        duration = time.time() - start_time
        logger.info(f"Optimized related characters query completed in {duration:.3f}s")
        
        return related_characters[:limit]

class QueryPerformanceMonitor:
    """Monitor and log query performance."""
    
    def __init__(self):
        self.slow_query_threshold = 0.5  # 500ms
        self.query_stats = {}
    
    def monitor_query(self, query_name: str, duration: float, result_count: int = 0):
        """Monitor query performance and log slow queries."""
        if duration > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {query_name} took {duration:.3f}s, "
                f"returned {result_count} results"
            )
        
        # Update statistics
        if query_name not in self.query_stats:
            self.query_stats[query_name] = {
                'count': 0,
                'total_duration': 0.0,
                'min_duration': float('inf'),
                'max_duration': 0.0,
                'result_count': 0
            }
        
        stats = self.query_stats[query_name]
        stats['count'] += 1
        stats['total_duration'] += duration
        stats['min_duration'] = min(stats['min_duration'], duration)
        stats['max_duration'] = max(stats['max_duration'], duration)
        stats['result_count'] += result_count
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for all monitored queries."""
        return {
            name: {
                'count': stats['count'],
                'avg_duration': stats['total_duration'] / stats['count'],
                'min_duration': stats['min_duration'],
                'max_duration': stats['max_duration'],
                'avg_result_count': stats['result_count'] / stats['count']
            }
            for name, stats in self.query_stats.items()
        }

# Global performance monitor
performance_monitor = QueryPerformanceMonitor()

def monitor_query_performance(query_name: str):
    """Decorator to monitor query performance."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                result_count = len(result) if hasattr(result, '__len__') else 0
                performance_monitor.monitor_query(query_name, duration, result_count)
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.monitor_query(f"{query_name}_error", duration, 0)
                raise
        return wrapper
    return decorator
