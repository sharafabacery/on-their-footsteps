import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MapPin, ChevronRight, BookOpen, Users, Volume2, Star, Heart, Share2, Bookmark, Calendar, Award, TrendingUp, Eye, ThumbsUp } from 'lucide-react'
import Lottie from 'lottie-react'
import { useCharacter } from '../hooks/useCharacters'
import AudioPlayer from '../components/AudioPlayer'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorDisplay from '../components/ErrorDisplay'
import { getErrorMessage } from '../utils/errorHandler'
import toast from 'react-hot-toast'

// Lazy load heavy components
const CharacterHero = lazy(() => import('../components/CharacterHero'));
const CharacterActions = lazy(() => import('../components/CharacterActions'));
const CharacterTabs = lazy(() => import('../components/CharacterTabs'));
const CharacterStats = lazy(() => import('../components/CharacterStats'));
const CharacterTimeline = lazy(() => import('../components/CharacterTimeline'));

const CharacterDetail = () => {
  const { idOrSlug } = useParams()
  // Ensure we're using the correct ID from the URL and it's a valid number
  const id = !isNaN(parseInt(idOrSlug)) ? parseInt(idOrSlug) : idOrSlug;
  const [activeTab, setActiveTab] = useState('story')
  const [bookmarked, setBookmarked] = useState(false)
  
  // Use the new character hook with error boundaries
  const { 
    character, 
    loading, 
    error, 
    toggleLike, 
    shareCharacter, 
    incrementViews,
    clearError 
  } = useCharacter(id, {
    onError: (err) => {
      console.error('Error loading character:', err);
    },
    onSuccess: (data) => {
      console.log('Character loaded successfully:', data?.name || 'Unknown character');
    }
  })

  // Increment views when character loads - only once per session
  useEffect(() => {
    if (!id) return; // Don't proceed if no valid ID
    
    const viewKey = `character_${id}_viewed`;
    const hasViewed = sessionStorage.getItem(viewKey);
    
    if (!hasViewed && character?.id === id) { // Only increment if the character matches the URL ID
      console.log('Incrementing views for character:', id);
      incrementViews().then(updatedChar => {
        if (updatedChar) {
          sessionStorage.setItem(viewKey, 'true');
          console.log('Views incremented successfully');
        }
      }).catch(err => {
        console.error('Failed to increment views:', err);
      });
    }
  }, [id, character?.id, incrementViews])

  // Handle bookmark toggle
  const handleBookmarkToggle = async () => {
    if (!character) return
    
    try {
      const updatedCharacter = await toggleLike(!bookmarked)
      if (updatedCharacter) {
        setBookmarked(!bookmarked)
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
    }
  }

  // Handle share
  const handleShare = async () => {
    if (!character) return
    
    try {
      const result = await shareCharacter()
      if (result) {
        // Implement native share or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: character.arabic_name || character.name,
            text: character.description,
            url: window.location.href
          })
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(window.location.href)
        }
      }
    } catch (err) {
      console.error('Failed to share character:', err)
    }
  }

  // Handle retry
  const handleRetry = () => {
    clearError()
  }

  // Show loading state only on initial load
  if (loading && !character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="mr-4 text-lg">جاري تحميل بيانات الشخصية...</span>
      </div>
    )
  }

  // Error state
  if (error && !character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="حدث خطأ في تحميل بيانات الشخصية"
        />
      </div>
    )
  }

  // No character found after loading
  if (!character && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">لم يتم العثور على الشخصية</h2>
        <p className="text-gray-600 mb-6">عذراً، تعذر تحميل بيانات الشخصية المطلوبة.</p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          العودة للخلف
        </button>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>{`${character.arabic_name || character.name} - على خطاهم`}</title>
        <meta name="description" content={character.description} />
        <meta property="og:title" content={character.arabic_name || character.name} />
        <meta property="og:description" content={character.description} />
        {character.profile_image && (
          <meta property="og:image" content={character.profile_image} />
        )}
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-rose-200/20 to-pink-200/20 rounded-full blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Hero Section */}
        <Suspense fallback={<LoadingSpinner />}>
          <CharacterHero character={character} />
        </Suspense>

        {/* Enhanced Main Content */}
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Story Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Enhanced Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/20"
              >
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBookmarkToggle}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                      bookmarked 
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:shadow-md'
                    }`}
                  >
                    <Bookmark size={18} className={bookmarked ? 'fill-current' : ''} />
                    <span>{bookmarked ? 'محفوظ' : 'حفظ'}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    <Share2 size={18} />
                    <span>مشاركة</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    <Heart size={18} />
                    <span>إعجاب</span>
                  </motion.button>
                </div>
              </motion.div>

              {/* Enhanced Tabs */}
              <Suspense fallback={<LoadingSpinner />}>
                <CharacterTabs
                  character={character}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              </Suspense>

              <AnimatePresence mode="wait">
                {activeTab === 'story' && (
                  <motion.div
                    key="story"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/20"
                  >
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      <span>القصة الكاملة</span>
                    </h2>
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg space-y-4">
                        {character.full_story?.split('\n').map((paragraph, idx) => (
                          <motion.p
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="mb-4 p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg border-r-4 border-amber-400 dark:border-orange-400"
                          >
                            {paragraph}
                          </motion.p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/20"
                  >
                    <CharacterTimeline events={character.timeline_events} />
                  </motion.div>
                )}

                {activeTab === 'achievements' && (
                  <motion.div
                    key="achievements"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/20"
                  >
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg">
                        <Award className="text-white" size={24} />
                      </div>
                      <span>الإنجازات الرئيسية</span>
                    </h2>
                    <div className="space-y-4">
                      {character.key_achievements?.map((achievement, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-6 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl shadow-lg">
                              <Star className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{achievement}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'lessons' && (
                  <motion.div
                    key="lessons"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/20"
                  >
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      <span>الدروس المستفادة</span>
                    </h2>
                    <div className="space-y-4">
                      {character.lessons?.map((lesson, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-6 bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl shadow-lg">
                              <BookOpen className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{lesson}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Audio Stories */}
              {character.audio_stories?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/20"
                >
                  <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg">
                      <Volume2 className="text-white" size={24} />
                    </div>
                    <span>قصص صوتية</span>
                  </h3>
                  <div className="space-y-4">
                    {character.audio_stories.map((audio, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4 border border-purple-200 dark:border-purple-800"
                      >
                        <AudioPlayer src={audio.url} title={audio.title} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Enhanced Stats and Info */}
            <div className="space-y-6">
              {/* Character Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <CharacterStats character={character} />
              </motion.div>

              {/* Enhanced Quick Facts */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/20"
              >
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-lg">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <span>معلومات سريعة</span>
                </h3>
                <div className="space-y-4">
                  {character.birth_year && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                          <Clock size={16} className="text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <span className="font-medium">سنة الميلاد</span>
                      </div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-300">{character.birth_year} م</span>
                    </motion.div>
                  )}

                  {character.birth_place && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <MapPin size={16} className="text-green-600 dark:text-green-300" />
                        </div>
                        <span className="font-medium">مكان الميلاد</span>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-300">{character.birth_place}</span>
                    </motion.div>
                  )}

                  {character.death_year && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-50/50 to-pink-50/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
                          <Clock size={16} className="text-rose-600 dark:text-rose-300" />
                        </div>
                        <span className="font-medium">سنة الوفاة</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-300">{character.death_year} م</span>
                    </motion.div>
                  )}

                  {character.death_place && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <MapPin size={16} className="text-purple-600 dark:text-purple-300" />
                        </div>
                        <span className="font-medium">مكان الوفاة</span>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-300">{character.death_place}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Enhanced Statistics */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden"
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-xl"></div>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <TrendingUp className="text-white" size={20} />
                    </div>
                    <span>الإحصائيات</span>
                  </h3>
                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Eye size={18} className="text-white" />
                        </div>
                        <span className="font-medium">المشاهدات</span>
                      </div>
                      <span className="font-bold text-2xl">
                        {character?.views_count?.toLocaleString() || '0'}
                      </span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <ThumbsUp size={18} className="text-white" />
                        </div>
                        <span className="font-medium">المعجبون</span>
                      </div>
                      <span className="font-bold text-2xl">
                        {character?.likes_count?.toLocaleString() || '0'}
                      </span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterDetail
