import React from 'react';
import './LessonBrief.css';

const LessonBrief = ({ lesson, onStartLesson, onBack }) => {
  return (
    <div className="lesson-brief">
      <div className="brief-container">
        <div className="brief-header">
          <button className="back-btn" onClick={onBack}>
            ← العودة
          </button>
          <h2>قبل ما ندخل الدرس 📚</h2>
        </div>

        <div className="brief-content">
          <div className="brief-item">
            <h3>إنت هتتعلم إيه؟</h3>
            <div className="lesson-info">
              <h4>{lesson.arabic_title || lesson.title}</h4>
              <p>{lesson.description}</p>
            </div>
          </div>

          <div className="brief-item">
            <h3>الدرس مدته قد إيه؟</h3>
            <div className="duration-info">
              <span className="duration-icon">⏱️</span>
              <span className="duration-text">حوالي {lesson.duration} دقيقة</span>
            </div>
          </div>

          <div className="brief-item">
            <h3>هل فيه كويز في الآخر؟</h3>
            <div className="quiz-info">
              {lesson.hasQuiz ? (
                <>
                  <span className="quiz-icon">📝</span>
                  <span className="quiz-text">نعم، فيه كويز صغير في الآخر</span>
                </>
              ) : (
                <>
                  <span className="no-quiz-icon">📖</span>
                  <span className="no-quiz-text">لا، مجرد قراءة ومتعة</span>
                </>
              )}
            </div>
          </div>

          <div className="brief-example">
            <h3>مثال:</h3>
            <div className="example-content">
              <p>"{lesson.example || `النهارده هنتعلم إزاي ${lesson.arabic_title || lesson.title}، قصة ممتعة انتظرك!`}"</p>
            </div>
          </div>

          <div className="brief-actions">
            <button 
              className="start-lesson-btn"
              onClick={onStartLesson}
            >
              ابدأ الدرس 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonBrief;
