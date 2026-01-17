import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../context/GamificationContext';
import { characters } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const Categories = () => {
  const { categories, unlockCategory, user } = useGamification();
  const [loading, setLoading] = useState(true);
  const [categoriesList, setCategoriesList] = useState([]);

  const categoryData = [
    {
      id: 'غزوات',
      title: 'الغزوات والمعارك',
      description: 'تعرف على غزوات الرسول والمعارك الإسلامية',
      icon: '⚔️',
      color: 'red',
      difficulty: 'متوسط',
      estimatedTime: '15-20 دقيقة',
      prerequisites: [],
      rewards: { xp: 50, badge: 'بطل المعارك' }
    },
    {
      id: 'تعاملات',
      title: 'التعاملات النبوية',
      description: 'تعلم من أخلاق الرسول وتعاملاته مع الناس',
      icon: '🤝',
      color: 'green',
      difficulty: 'سهل',
      estimatedTime: '10-15 دقيقة',
      prerequisites: ['سيرة'],
      rewards: { xp: 30, badge: 'قدوة حسنة' }
    },
    {
      id: 'سيرة',
      title: 'السيرة النبوية',
      description: 'حياة الرسول صلى الله عليه وسلم منذ الميلاد',
      icon: '📖',
      color: 'blue',
      difficulty: 'سهل',
      estimatedTime: '20-25 دقيقة',
      prerequisites: [],
      rewards: { xp: 40, badge: 'عارف بالسيرة' }
    },
    {
      id: 'صحابة',
      title: 'حياة الصحابة',
      description: 'تعرف على أصحاب الرسول وإنجازاتهم',
      icon: '👥',
      color: 'purple',
      difficulty: 'متوسط',
      estimatedTime: '25-30 دقيقة',
      prerequisites: ['سيرة'],
      rewards: { xp: 60, badge: 'رفيق الرسول' }
    }
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await characters.getCategories();
        setCategoriesList(response.data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (category) => {
    if (!category.unlocked) {
      const hasPrerequisites = category.prerequisites.every((prereq) =>
        categories[prereq]?.progress >= categories[prereq]?.total
      );

      if (!hasPrerequisites) {
        toast.error('يجب إكمال المتطلبات الأساسية أولاً');
        return;
      }

      unlockCategory(category.id);
      toast.success(`تم فتح ${category.title}!`);
    }
  };

  const isLocked = (category) => {
    if (category.prerequisites.length === 0) return false;

    return !category.prerequisites.every((prereq) =>
      categories[prereq]?.progress >= categories[prereq]?.total
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            اختر فئة التعلم
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            ابدأ رحلتك في تعلم السيرة النبوية والغزوات والتعاملات الإسلامية
          </p>
        </div>

        {/* User Progress Summary */}
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
              <div className="text-2xl font-bold text-orange-600">
                {user.completedQuizzes}
              </div>
              <div className="text-sm text-gray-600">اختبار مكتمل</div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {categoryData.map((category) => {
            const locked = isLocked(category);
            const progress = categories[category.id]?.progress || 0;
            const total = categories[category.id]?.total || 4;

            return (
              <div
                key={category.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
                  locked ? 'opacity-75' : 'hover:shadow-lg'
                }`}
              >
                {/* Category Header */}
                <div
                  className={`bg-${category.color}-100 p-6 border-b border-${category.color}-200`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="text-4xl">{category.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {category.title}
                        </h3>
                        <p className="text-sm text-gray-600">{category.difficulty}</p>
                      </div>
                    </div>
                    {locked && <div className="text-2xl">🔒</div>}
                  </div>
                </div>

                {/* Category Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{category.description}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>المدة التقديرية:</span>
                      <span className="font-medium">{category.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>المكافآت:</span>
                      <span className="font-medium text-green-600">
                        {category.rewards.xp} XP + {category.rewards.badge}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الدروس:</span>
                      <span className="font-medium">{progress}/{total}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className={`bg-${category.color}-600 h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${(progress / total) * 100}%` }}
                    />
                  </div>

                  {/* Prerequisites */}
                  {category.prerequisites.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
                      <p className="text-xs text-yellow-800">
                        <strong>المتطلبات:</strong> {category.prerequisites.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleCategoryClick(category)}
                    disabled={locked}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      locked
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : `bg-${category.color}-600 text-white hover:bg-${category.color}-700`
                    }`}
                  >
                    {locked ? 'مقفل' : progress > 0 ? 'متابعة التعلم' : 'ابدأ التعلم'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 المتصدرين هذا الأسبوع</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-2xl">🥇</div>
              <div>
                <div className="font-medium">أحمد محمد</div>
                <div className="text-sm text-gray-600">المستوى 12 • 1,250 XP</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-2xl">🥈</div>
              <div>
                <div className="font-medium">فاطمة علي</div>
                <div className="text-sm text-gray-600">المستوى 10 • 980 XP</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-2xl">🥉</div>
              <div>
                <div className="font-medium">عمر خالد</div>
                <div className="text-sm text-gray-600">المستوى 8 • 750 XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;