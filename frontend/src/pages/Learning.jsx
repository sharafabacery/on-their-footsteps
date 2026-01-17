import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGamification } from '../context/GamificationContext'
import VideoPlayer from '../components/learning/VideoPlayer'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

const Learning = () => {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { user, unlockCategory } = useGamification()
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lessons, setLessons] = useState([])

  // Sample lessons data - in real app, this would come from API
  const lessonsData = {
    'غزوات': [
      {
        id: 'ghazwat-badr',
        number: 1,
        title: 'غزوة بدر الكبرى',
        category: 'الغزوات والمعارك',
        duration: 300, // 5 minutes in seconds
        difficulty: 'متوسط',
        videoUrl: '/videos/badr.mp4',
        thumbnail: '/images/badr-thumbnail.jpg',
        objectives: [
          'فهم أسباب غزوة بدر',
          'تعلم أحداث المعركة الرئيسية',
          'معرفة الدروس المستفادة',
          'تطبيق القيم الإسلامية'
        ],
        prerequisites: [],
        xp: 50,
        locked: false
      },
      {
        id: 'ghazwat-uhud',
        number: 2,
        title: 'غزوة أحد',
        category: 'الغزوات والمعارك',
        duration: 420, // 7 minutes
        difficulty: 'متوسط',
        videoUrl: '/videos/uhud.mp4',
        thumbnail: '/images/uhud-thumbnail.jpg',
        objectives: [
          'فهم أسباب غزوة أحد',
          'تعلم الدروس من الهزيمة',
          'معرفة أهمية الصبر',
          'تطيق الثبات على المبادئ'
        ],
        prerequisites: ['ghazwat-badr'],
        xp: 60,
        locked: user.level < 2
      }
    ],
    'تعاملات': [
      {
        id: 'taalomat-children',
        number: 1,
        title: 'الرحمة بالأطفال',
        category: 'التعاملات النبوية',
        duration: 240, // 4 minutes
        difficulty: 'سهل',
        videoUrl: '/videos/children-mercy.mp4',
        thumbnail: '/images/children-mercy-thumbnail.jpg',
        objectives: [
          'فهم رحمة الرسول بالأطفال',
          'تعلم كيفية معاملة الأبناء',
          'تطبيق الرحمة في حياتنا',
          'معرفة أهمية الرحمة في الإسلام'
        ],
        prerequisites: [],
        xp: 30,
        locked: false
      }
    ],
    'سيرة': [
      {
        id: 'seerah-birth',
        number: 1,
        title: 'المولد والنشأة',
        category: 'السيرة النبوية',
        duration: 360, // 6 minutes
        difficulty: 'سهل',
        videoUrl: '/videos/birth.mp4',
        thumbnail: '/images/birth-thumbnail.jpg',
        objectives: [
          'فهم ولادة الرسول',
          'تعلم عن نشأته في مكة',
          'معرفة رعاية جده له',
          'تطيق قيمة بر الوالدين'
        ],
        prerequisites: [],
        xp: 40,
        locked: false
      }
    ]
  }

  useEffect(() => {
    const loadLessons = async () => {
      setLoading(true)
      
      // Check if category is unlocked
      const categoryLessons = lessonsData[categoryId] || []
      const hasPrerequisites = user.level >= 1 // Simple check for demo
      
      if (!hasPrerequisites && categoryId !== 'سيرة') {
        toast.error('يجب إكمال السيرة النبوية أولاً')
        navigate('/categories')
        return
      }

      setLessons(categoryLessons)
      setLoading(false)
    }

    loadLessons()
  }, [categoryId, user.level, navigate])

  const handleLessonClick = (lesson) => {
    if (lesson.locked) {
      toast.error('هذا الدرس مقفل. أكمل الدروس السابقة أولاً')
      return
    }
    setSelectedLesson(lesson)
  }

  const handleBackToLessons = () => {
    setSelectedLesson(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (selectedLesson) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={handleBackToLessons}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة للدروس
          </button>

          {/* Video Player */}
          <VideoPlayer lesson={selectedLesson} />
        </div>
      </div>
    )
  }

  const getCategoryTitle = (categoryId) => {
    switch (categoryId) {
      case 'غزوات': return 'الغزوات والمعارك'
      case 'تعاملات': return 'التعاملات النبوية'
      case 'سيرة': return 'السيرة النبوية'
      case 'صحابة': return 'حياة الصحابة'
      default: return 'الدروس'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {getCategoryTitle(categoryId)}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            اختر الدرس الذي تريد مشاهدته وابدأ رحلة التعلم
          </p>
        </div>

        {/* User Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{user.level}</div>
              <div className="text-sm text-gray-600">المستوى</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{user.xp}</div>
              <div className="text-sm text-gray-600">نقطة الخبرة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{user.streak}</div>
              <div className="text-sm text-gray-600">يوم متواصل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{lessons.filter(l => !l.locked).length}/{lessons.length}</div>
              <div className="text-sm text-gray-600">دروس مكتملة</div>
            </div>
          </div>
        </div>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleLessonClick(lesson)}
              className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-300 ${
                lesson.locked ? 'opacity-75' : 'hover:shadow-lg hover:scale-105'
              }`}
            >
              {/* Lesson Thumbnail */}
              <div className="relative">
                <img
                  src={lesson.thumbnail}
                  alt={lesson.title}
                  className="w-full h-48 object-cover"
                />
                {lesson.locked && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <div className="text-sm">مقفل</div>
                      <div className="text-xs">المستوى {lesson.locked ? '3' : '2'}</div>
                    </div>
                  </div>
                )}
                {!lesson.locked && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {lesson.duration >= 60 ? `${Math.floor(lesson.duration / 60)} دقيقة` : `${lesson.duration} ثانية`}
                  </div>
                )}
              </div>

              {/* Lesson Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    lesson.difficulty === 'سهل' ? 'bg-green-100 text-green-800' :
                    lesson.difficulty === 'متوسط' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lesson.difficulty}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>الدرس رقم:</span>
                    <span className="font-medium">{lesson.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نقاط XP:</span>
                    <span className="font-medium text-green-600">{lesson.xp}</span>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: lesson.locked ? '0%' : '0%' }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full mt-3 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    lesson.locked
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {lesson.locked ? 'مقفل' : 'ابدأ الدرس'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {lessons.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477 4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              لا توجد دروس متاحة
            </h3>
            <p className="text-gray-600">
              سيتم إضافة دروس لهذه الفئة قريباً
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Learning
