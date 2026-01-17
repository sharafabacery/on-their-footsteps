import React, { useState, useEffect } from 'react'
import { useGamification } from '../../context/GamificationContext'
import toast from 'react-hot-toast'

const QuizSystem = ({ lessonId, lessonTitle, onQuizComplete }) => {
  const { user, completeQuiz, addXP } = useGamification()
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)

  // Sample quiz data - in real app, this would come from API
  const sampleQuizzes = {
    'ghazwat-badr': {
      title: 'غزوة بدر',
      questions: [
        {
          question: 'متى وقعت غزوة بدر الكبرى؟',
          options: ['في السنة الثانية للهجرة', 'في السنة الثالثة للهجرة', 'في السنة الرابعة للهجرة', 'في السنة الخامسة للهجرة'],
          correct: 0,
          explanation: 'وقعت غزوة بدر في 17 رمضان من السنة الثانية للهجرة'
        },
        {
          question: 'كم كان عدد المسلمين في غزوة بدر؟',
          options: ['313', '314', '315', '316'],
          correct: 1,
          explanation: 'كان عدد المسلمين 314 مقاتل و 70 من الأنصار'
        },
        {
          question: 'ما هو السبب الرئيسي لغزوة بدر؟',
          options: ['الدفاع عن المدينة', 'حماية القوافل', 'استعادة أموال المسلمين', 'كل ما ذكر'],
          correct: 2,
          explanation: 'كان الهدف الرئيسي هو استعادة أموال المسلمين التي أخذتها قريش'
        }
      ]
    },
    'taalomat-children': {
      title: 'الرحمة بالأطفال',
      questions: [
        {
          question: 'ماذا كان الرسول يفعل عندما يرى طفلاً؟',
          options: ['يبتسم له', 'يلاعبه', 'يدعو له', 'كل ما ذكر'],
          correct: 3,
          explanation: 'كان الرسول صلى الله عليه وسلم يلاطف الأطفال ويدعو لهم بالخير'
        },
        {
          question: 'كيف كان يعامل أبناءه؟',
          options: ['بشدة', 'بترفق', 'بإهمال', 'بمساواة'],
          correct: 1,
          explanation: 'كان يعامل أبناءه برفق ورحمة شديدة'
        }
      ]
    }
  }

  useEffect(() => {
    // Load quiz based on lessonId
    const lessonQuiz = sampleQuizzes[lessonId] || sampleQuizzes['ghazwat-badr']
    setQuiz(lessonQuiz)
  }, [lessonId])

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      toast.error('يرجى اختيار إجابة')
      return
    }

    const isCorrect = selectedAnswer === quiz.questions[currentQuestion].correct
    if (isCorrect) {
      setScore(score + 1)
      addXP(10)
      toast.success('إجابة صحيحة! +10 XP')
    } else {
      toast.error('إجابة خاطئة')
    }

    setShowResult(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer('')
      setShowResult(false)
    } else {
      // Quiz completed
      const finalScore = Math.round((score / quiz.questions.length) * 100)
      completeQuiz(lessonId, finalScore)
      addXP(finalScore)
      onQuizComplete(finalScore)
      toast.success(`أكملت الاختبار! ${finalScore}% +${finalScore} XP`)
    }
  }

  const handleRestartQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setSelectedAnswer('')
    setShowResult(false)
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const progressPercentage = ((currentQuestion + 1) / quiz.questions.length) * 100

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Quiz Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">{quiz.title}</h3>
          <div className="flex items-center space-x-4 space-x-reverse">
            <span className="text-sm text-gray-600">السؤال {currentQuestion + 1}/{quiz.questions.length}</span>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-sm font-medium text-blue-600">المستوى {user.level}</span>
              <span className="text-sm font-medium text-green-600">{user.xp} XP</span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {quiz.questions[currentQuestion].question}
          </h4>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {quiz.questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => !showResult && handleAnswerSelect(index)}
              disabled={showResult}
              className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                showResult
                  ? index === quiz.questions[currentQuestion].correct
                    ? 'border-green-500 bg-green-50'
                    : index === selectedAnswer
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                  : selectedAnswer === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option}</span>
                {showResult && index === quiz.questions[currentQuestion].correct && (
                  <span className="text-green-600 text-xl">✓</span>
                )}
                {showResult && index === selectedAnswer && index !== quiz.questions[currentQuestion].correct && (
                  <span className="text-red-600 text-xl">✗</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation */}
        {showResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            selectedAnswer === quiz.questions[currentQuestion].correct
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className="text-sm">
              <strong>الشرح:</strong> {quiz.questions[currentQuestion].explanation}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleRestartQuiz}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          إعادة الاختبار
        </button>
        
        {!showResult ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            إرسال الإجابة
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            {currentQuestion < quiz.questions.length - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'}
          </button>
        )}
      </div>

      {/* Score Display */}
      {score > 0 && (
        <div className="mt-4 text-center">
          <span className="text-lg font-semibold text-blue-600">
            النقاط: {score}/{quiz.questions.length}
          </span>
        </div>
      )}
    </div>
  )
}

export default QuizSystem
