import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import {
  Crown,
  Shield,
  BookOpen,
  Sword,
  Heart,
  Users,
  Award,
  Quote,
  MapPin,
  Calendar,
  Star,
  BookMarked
} from 'lucide-react';

const AbuBakrCharacter = ({ character }) => {
  const [activeSection, setActiveSection] = useState('story');
  const [activeTimeline, setActiveTimeline] = useState(0);

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero Section */}
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 via-emerald-800/70 to-transparent" />
          <div className="absolute inset-0 bg-[url('/static/images/patterns/islamic-pattern.png')] opacity-10" />
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-white max-w-3xl"
          >
            {/* Title and Badges */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-6xl font-bold font-arabic-heading mb-2">
                  {character.arabic_name}
                </h1>
                <h2 className="text-4xl font-bold">{character.name}</h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-xl mb-8 text-gray-200 max-w-2xl">
              {character.description}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Calendar className="w-5 h-5" />
                <span>العمر: {character.age} سنة</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <MapPin className="w-5 h-5" />
                <span>مكة المكرمة → المدينة المنورة</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Award className="w-5 h-5" />
                <span>أول الخلفاء الراشدين</span>
              </div>
            </div>
          </motion.div>

          {/* Character Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-0 bottom-0 w-96 h-96"
          >
            <Lottie
              animationData={character.media.animations[0]}
              loop={true}
              autoplay={true}
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Story Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto mb-8 bg-white rounded-xl shadow-lg p-2">
              {[
                { id: 'story', label: 'القصة', icon: BookOpen },
                { id: 'timeline', label: 'الخط الزمني', icon: Calendar },
                { id: 'achievements', label: 'الإنجازات', icon: Award },
                { id: 'lessons', label: 'الدروس', icon: Heart },
                { id: 'quotes', label: 'الأقوال', icon: Quote }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg whitespace-nowrap transition-all ${
                    activeSection === tab.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Section Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                {activeSection === 'story' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">سيرة أبو بكر الصديق</h3>
                    {character.full_story.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="text-gray-700 leading-relaxed text-lg">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {activeSection === 'timeline' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">الخط الزمني للحياة</h3>
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-green-500 to-emerald-600" />
                      
                      {/* Timeline Events */}
                      {character.timeline_events.map((event, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`relative flex items-center mb-8 ${
                            idx % 2 === 0 ? 'flex-row-reverse' : ''
                          }`}
                          onClick={() => setActiveTimeline(idx)}
                        >
                          {/* Event Card */}
                          <div className={`w-1/2 ${idx % 2 === 0 ? 'pr-8 text-left' : 'pl-8 text-right'}`}>
                            <div className={`p-6 rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] ${
                              activeTimeline === idx
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                                : 'bg-white border border-gray-200'
                            }`}>
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${
                                  activeTimeline === idx ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <span className="text-2xl">{event.icon}</span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg text-gray-800">{event.title}</h4>
                                  <p className="text-gray-600">سنة {event.year}م</p>
                                </div>
                              </div>
                              <p className="text-gray-700">{event.content}</p>
                            </div>
                          </div>

                          {/* Timeline Dot */}
                          <div className="absolute left-1/2 transform -translate-x-1/2">
                            <div className={`w-8 h-8 rounded-full border-4 border-white shadow-lg ${
                              activeTimeline === idx
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                : 'bg-gray-300'
                            }`} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'achievements' && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">أبرز الإنجازات</h3>
                    {character.key_achievements.map((achievement, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                      >
                        <div className="p-3 bg-green-100 rounded-lg">
                          {idx === 0 && <Users className="w-6 h-6 text-green-600" />}
                          {idx === 1 && <BookMarked className="w-6 h-6 text-green-600" />}
                          {idx === 2 && <Sword className="w-6 h-6 text-green-600" />}
                          {idx === 3 && <BookOpen className="w-6 h-6 text-green-600" />}
                          {idx === 4 && <Shield className="w-6 h-6 text-green-600" />}
                          {idx === 5 && <Award className="w-6 h-6 text-green-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-800 mb-2">
                            {['الإيمان الأول', 'رفيق الهجرة', 'الخلافة', 'جمع القرآن', 'حروب الردة', 'الفتوحات'][idx]}
                          </h4>
                          <p className="text-gray-700">{achievement}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeSection === 'lessons' && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">الدروس المستفادة</h3>
                    {character.lessons.map((lesson, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200"
                      >
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Heart className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-gray-700 text-lg">{lesson}</p>
                          <div className="mt-2 flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < [4, 5, 4, 5, 4, 5][idx] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeSection === 'quotes' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">أقوال مأثورة</h3>
                    {character.quotes.map((quote, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200"
                      >
                        <Quote className="absolute top-4 right-4 w-8 h-8 text-amber-400" />
                        <p className="text-gray-800 text-xl leading-relaxed font-arabic-heading">
                          "{quote}"
                        </p>
                        <div className="mt-4 pt-4 border-t border-amber-200">
                          <p className="text-amber-600 font-medium">— أبو بكر الصديق</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Character Traits */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">صفات الشخصية</h3>
              <div className="space-y-4">
                {Object.entries(character.character_traits).map(([trait, value]) => (
                  <div key={trait} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 capitalize">
                        {{
                          courage: 'الشجاعة',
                          wisdom: 'الحكمة',
                          generosity: 'الكرم',
                          justice: 'العدل',
                          piety: 'التقوى',
                          leadership: 'القيادة'
                        }[trait]}
                      </span>
                      <span className="font-bold text-green-600">{value}/10</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 10}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Verses */}
            <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">آيات قرآنية</h3>
              {character.related_verses.map((verse, idx) => (
                <div key={idx} className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-emerald-200 font-medium">
                      {verse.surah} - آية {verse.ayah}
                    </span>
                    <div className="px-2 py-1 bg-white/20 rounded text-sm">
                      قرآن كريم
                    </div>
                  </div>
                  <p className="text-lg font-arabic-heading leading-relaxed mb-2">
                    {verse.text}
                  </p>
                  <p className="text-emerald-200 text-sm">{verse.translation}</p>
                </div>
              ))}
            </div>

            {/* Family Tree */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">الشجرة العائلية</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">الأب</p>
                  <p className="font-medium">{character.relationships.father}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">الأم</p>
                  <p className="font-medium">{character.relationships.mother}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">الأبناء</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {character.relationships.children.map((child, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {child}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">الإحصائيات</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {character.stats.views_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">المشاهدات</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {character.stats.likes_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">الإعجابات</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {character.stats.completion_rate}%
                  </div>
                  <div className="text-sm text-gray-600">معدل الإكمال</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {character.stats.shares_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">المشاركات</div>
                </div>
              </div>
            </div>

            {/* Animation Preview */}
            {character.media.animations && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">معاينة تفاعلية</h3>
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
                  <Lottie
                    animationData={character.media.animations[1]}
                    loop={true}
                    autoplay={true}
                    className="w-full h-full"
                  />
                </div>
                <p className="text-center text-gray-600 mt-3">بيعة أبو بكر الصديق</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Quiz Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-3xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">اختبر معلوماتك عن أبو بكر الصديق</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl">
              <h4 className="font-bold mb-3">سؤال ١: كم كان عمر أبو بكر عندما أسلم؟</h4>
              <div className="space-y-2">
                {['38 سنة', '40 سنة', '35 سنة', '32 سنة'].map((option, idx) => (
                  <button
                    key={idx}
                    className="w-full p-3 text-left rounded-lg bg-white/5 hover:bg-white/20 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl">
              <h4 className="font-bold mb-3">سؤال ٢: كم مدة خلافة أبو بكر؟</h4>
              <div className="space-y-2">
                {['سنتان وثلاثة أشهر', 'ثلاث سنوات', 'أربع سنوات', 'سنة واحدة'].map((option, idx) => (
                  <button
                    key={idx}
                    className="w-full p-3 text-left rounded-lg bg-white/5 hover:bg-white/20 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbuBakrCharacter;