"""
Script to add sample character data for testing
"""

from sqlalchemy.orm import Session
from app.database import engine, get_db
from app.models import IslamicCharacter

def add_sample_characters():
    """Add sample Islamic characters to the database"""
    db = next(get_db())
    
    sample_characters = [
        {
            "name": "Prophet Muhammad",
            "arabic_name": "محمد بن عبد الله",
            "title": "The Final Prophet",
            "description": "The final prophet and messenger of Islam",
            "birth_year": 570,
            "death_year": 632,
            "era": "عصر النبوة",
            "category": "الأنبياء",
            "sub_category": "نبي",
            "slug": "muhammad",
            "full_story": "The story of Prophet Muhammad (peace be upon him) is the story of the final messenger of Allah...",
            "key_achievements": ["Received the final revelation", "Established the first Islamic state", "United the Arabian tribes"],
            "lessons": ["Patience in adversity", "Trust in Allah", "Importance of community"],
            "quotes": ["The best among you are those who learn the Quran and teach it"],
            "profile_image": "/images/prophet_muhammad.jpg",
            "views_count": 1000,
            "likes_count": 500,
            "is_featured": True,
            "is_verified": True
        },
        {
            "name": "Umar ibn al-Khattab",
            "arabic_name": "عمر بن الخطاب",
            "title": "The Second Caliph",
            "description": "The second caliph known for his justice and administrative skills",
            "birth_year": 584,
            "death_year": 644,
            "era": "الخلافة الراشدة",
            "category": "الصحابة",
            "sub_category": "خليفة",
            "slug": "umar-ibn-al-khattab",
            "full_story": "Umar ibn al-Khattab was the second caliph of Islam, known for his remarkable justice and administrative abilities...",
            "key_achievements": ["Established Islamic calendar", "Expanded Islamic empire", "Codified Islamic law"],
            "lessons": ["Justice and fairness", "Strong leadership", "Administrative excellence"],
            "quotes": ["If a mule stumbles while walking, I would fear that I might have stumbled"],
            "profile_image": "/images/umar.jpg",
            "views_count": 600,
            "likes_count": 300,
            "is_featured": True,
            "is_verified": True
        }
    ]
    
    try:
        for char_data in sample_characters:
            # Check if character already exists
            existing = db.query(IslamicCharacter).filter(
                IslamicCharacter.slug == char_data["slug"]
            ).first()
            
            if not existing:
                character = IslamicCharacter(**char_data)
                db.add(character)
                print(f"Added character: {char_data['name']}")
            else:
                print(f"Character already exists: {char_data['name']}")
        
        db.commit()
        print("Sample data added successfully!")
        
    except Exception as e:
        print(f"Error adding sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_characters()
