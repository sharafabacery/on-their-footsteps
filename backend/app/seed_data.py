import json
from sqlalchemy.orm import Session
from app.models import IslamicCharacter
from app.database import SessionLocal, engine
from app.models import Base

def seed_abu_bakr():
    """تعبئة بيانات أبو بكر الصديق في قاعدة البيانات"""
    
    # إنشاء الجداول
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # تحميل بيانات أبو بكر من ملف JSON
        with open('backend/data/characters/abu_bakr.json', 'r', encoding='utf-8') as f:
            abu_bakr_data = json.load(f)
        
        # التحقق إذا كانت الشخصية موجودة مسبقاً
        existing = db.query(IslamicCharacter).filter(
            IslamicCharacter.name == "أبو بكر الصديق"
        ).first()
        
        if not existing:
            # إنشاء كائن الشخصية
            character = IslamicCharacter(**abu_bakr_data)
            db.add(character)
            db.commit()
            db.refresh(character)
            print(f"✅ تم إضافة أبو بكر الصديق بنجاح (ID: {character.id})")
        else:
            print("⚠️  أبو بكر الصديق موجود مسبقاً")
            
    except Exception as e:
        db.rollback()
        print(f"❌ خطأ في تعبئة البيانات: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_abu_bakr()