import React, { useState, useRef, useEffect } from 'react'
import { useGamification } from '../../context/GamificationContext'
import QuizSystem from './QuizSystem'
import toast from 'react-hot-toast'

const VideoPlayer = ({ lesson }) => {
  const { user, addXP } = useGamification()
  const [isPlaying, setIsPlaying] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [watchTime, setWatchTime] = useState(0)
  const [completed, setCompleted] = useState(false)
  const videoRef = useRef(null)

  const handlePlay = () => {
    setIsPlaying(true)
    addXP(5) // XP for starting video
    toast.success('بدأت المشاهدة! +5 XP')
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime
      const duration = videoRef.current.duration
      const percentage = (currentTime / duration) * 100
      
      setWatchTime(currentTime)
      
      // Award XP for milestones
      if (percentage >= 25 && percentage < 26) {
        addXP(10)
        toast.success('شاهدت 25%! +10 XP')
      } else if (percentage >= 50 && percentage < 51) {
        addXP(15)
        toast.success('شاهدت 50%! +15 XP')
      } else if (percentage >= 75 && percentage < 76) {
        addXP(20)
        toast.success('شاهدت 75%! +20 XP')
      } else if (percentage >= 100 && !completed) {
        setCompleted(true)
        addXP(30)
        toast.success('أكملت الفيديو! +30 XP')
        setShowQuiz(true)
      }
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    setCompleted(true)
    addXP(30)
    toast.success('أكملت الفيديو! +30 XP')
    setShowQuiz(true)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleQuizComplete = (score) => {
    // Additional XP for quiz completion
    if (score >= 80) {
      addXP(50)
      toast.success('أداء ممتاز في الاختبار! +50 XP')
    }
  }

  if (showQuiz) {
    return (
      <div className="max-w-4xl mx-auto">
        <QuizSystem 
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          onQuizComplete={handleQuizComplete}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">{lesson.title}</h2>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-sm opacity-90">الفئة: {lesson.category}</span>
              <span className="text-sm opacity-90">المدة: {lesson.duration}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">المستوى {user.level}</div>
            <div className="text-lg font-bold">{user.xp} XP</div>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="w-full aspect-video"
          controls
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          poster={lesson.thumbnail}
        >
          <source src={lesson.videoUrl} type="video/mp4" />
          متصفحك لا يدعم تشغيل الفيديو.
        </video>

        {/* Overlay Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex justify-between items-center text-white">
            <div className="text-sm">
              {formatTime(watchTime)} / {formatTime(lesson.duration || 0)}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              {completed && (
                <span className="bg-green-600 text-xs px-2 py-1 rounded">
                  مكتمل ✓
                </span>
              )}
              {!showQuiz && completed && (
                <button
                  onClick={() => setShowQuiz(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  ابدأ الاختبار
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Info */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-sm text-gray-600">الدرس</div>
            <div className="font-semibold">{lesson.number}</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-1">⏱️</div>
            <div className="text-sm text-gray-600">المدة</div>
            <div className="font-semibold">{lesson.duration}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-sm text-gray-600">الصعوبة</div>
            <div className="font-semibold">{lesson.difficulty}</div>
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">أهداف التعلم</h3>
          <ul className="space-y-2">
            {lesson.objectives?.map((objective, index) => (
              <li key={index} className="flex items-start space-x-2 space-x-reverse">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-gray-700">{objective}</span>
              </li>
            )) || [
              'فهم أحداث الغزوة بشكل صحيح',
              'تعلم الدروس المستفادة من الحدث',
              'معرفة الشخصيات الرئيسية المشاركة',
              'تطبيق القيم الإسلامية في الحياة'
            ].map((objective, index) => (
              <li key={index} className="flex items-start space-x-2 space-x-reverse">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-gray-700">{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress Tracker */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">تقدمك في هذا الدرس</h3>
            <span className="text-sm text-gray-600">
              {completed ? 'مكتمل' : isPlaying ? 'جاري المشاهدة' : 'لم يبدأ'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((watchTime / (lesson.duration || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {!completed && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => videoRef.current?.play()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              {isPlaying ? 'إيقاف مؤقت' : 'ابدأ المشاهدة'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPlayer
