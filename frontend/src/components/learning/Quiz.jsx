import React, { useState, useEffect } from 'react';
import './Quiz.css';

const Quiz = ({ lesson, onQuizComplete, onSkipQuiz, quizAttempts = 0 }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showSkipOption, setShowSkipOption] = useState(false);

  // Mock quiz questions based on lesson
  const quizQuestions = [
    {
      question: `ما هو الدرس الرئيسي في قصة ${lesson.arabic_title || lesson.title}؟`,
      options: [
        'الصبر والإيمان',
        'القوة والشجاعة',
        'الحكمة والعلم',
        'العدل والمساواة'
      ],
      correctAnswer: 0
    },
    {
      question: `ما هي العبرة الرئيسية من قصة ${lesson.arabic_title || lesson.title}؟`,
      options: [
        'الثقة في الله',
        'الصبر على المصائب',
        'الإحسان للآخرين',
        'جميع ما سبق'
      ],
      correctAnswer: 3
    },
    {
      question: `كيف يمكننا تطبيق درس ${lesson.arabic_title || lesson.title} في حياتنا؟`,
      options: [
        'بالصلاة والدعاء',
        'بالصبر على الصعاب',
        'بمساعدة الآخرين',
        'كل ما سبق صحيح'
      ],
      correctAnswer: 3
    }
  ];

  useEffect(() => {
    // Show skip option after 2 failed attempts
    if (quizAttempts >= 2) {
      setShowSkipOption(true);
    }
  }, [quizAttempts]);

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === quizQuestions[currentQuestion].correctAnswer;
    const newAnswers = [...answers, { question: currentQuestion, answer: selectedAnswer, correct: isCorrect }];
    setAnswers(newAnswers);

    if (isCorrect) {
      setScore(score + 1);
    }

    // Move to next question or show results
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers([]);
  };

  const handleComplete = () => {
    const percentage = (score / quizQuestions.length) * 100;
    onQuizComplete({
      passed: percentage >= 70,
      score: percentage,
      correctAnswers: score,
      totalQuestions: quizQuestions.length
    });
  };

  const handleSkip = () => {
    onSkipQuiz();
  };

  const renderQuestion = () => (
    <div className="quiz-container">
      <div className="quiz-header">
        <h3>كويز صغير 📝</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
          />
        </div>
        <span className="question-counter">
          {currentQuestion + 1} / {quizQuestions.length}
        </span>
      </div>

      <div className="question-content">
        <h4>{quizQuestions[currentQuestion].question}</h4>
        
        <div className="answers-grid">
          {quizQuestions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`answer-btn ${selectedAnswer === index ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(index)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-actions">
        {showSkipOption && (
          <button className="skip-btn" onClick={handleSkip}>
            تخطي الكويز ↗️
          </button>
        )}
        
        <button 
          className="submit-btn"
          onClick={handleSubmitAnswer}
          disabled={selectedAnswer === null}
        >
          {currentQuestion < quizQuestions.length - 1 ? 'السؤال التالي →' : 'إنهاء الكويز ✅'}
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    const percentage = (score / quizQuestions.length) * 100;
    const passed = percentage >= 70;

    return (
      <div className="quiz-result">
        <div className="result-icon">
          {passed ? '🎉' : '😔'}
        </div>
        
        <h3>{passed ? 'أحسنت! نجحت في الكويز' : 'حاول مرة أخرى'}</h3>
        
        <div className="score-display">
          <div className="score-circle">
            <span className="score-text">{Math.round(percentage)}%</span>
          </div>
          <p>{score} من {quizQuestions.length} إجابات صحيحة</p>
        </div>

        {passed ? (
          <div className="success-message">
            <p>🎊 مبروك! لقد فتحت الدروس التالية</p>
            <button className="continue-btn" onClick={handleComplete}>
              متابعة الدروس →
            </button>
          </div>
        ) : (
          <div className="retry-message">
            <p>💪 حاول مرة أخرى لتحسين نتيجتك</p>
            <div className="retry-actions">
              <button className="retry-btn" onClick={handleRetry}>
                إعادة المحاولة 🔄
              </button>
              {showSkipOption && (
                <button className="skip-btn" onClick={handleSkip}>
                  تخطي الكويز ↗️
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="quiz-wrapper">
      {!showResult ? renderQuestion() : renderResult()}
    </div>
  );
};

export default Quiz;
