import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGamification } from '../context/GamificationContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  
  const { register } = useAuth()
  const { addXP } = useGamification()
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'البريد الإلكتروني مطلوب'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح'
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة'
    } else if (formData.password.length < 8) {
      newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، ورقم'
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة'
    }
    
    // Name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'الاسم الكامل مطلوب'
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'الاسم يجب أن يكون حرفين على الأقل'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name.trim()
      })
      
      if (result.success) {
        addXP(20) // Registration bonus
        toast.success('تم إنشاء الحساب بنجاح! مرحباً بك في منصة على خطاهم')
        navigate('/dashboard')
      } else {
        toast.error(result.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى')
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
    
    const strengthLevels = [
      { text: 'ضعيفة جداً', color: 'text-red-400' },
      { text: 'ضعيفة', color: 'text-orange-400' },
      { text: 'متوسطة', color: 'text-yellow-400' },
      { text: 'جيدة', color: 'text-blue-400' },
      { text: 'قوية', color: 'text-green-400' },
      { text: 'قوية جداً', color: 'text-green-400' }
    ]
    
    return {
      strength: (strength / 6) * 100,
      text: strengthLevels[Math.min(strength - 1, 5)]?.text || '',
      color: strengthLevels[Math.min(strength - 1, 5)]?.color || ''
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-96 -left-96 w-full h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-96 -right-96 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        {/* Stars effect */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                width: Math.random() * 3 + 'px',
                height: Math.random() * 3 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 5 + 's',
                animationDuration: Math.random() * 3 + 2 + 's'
              }}
            />
          ))}
        </div>
      </div>
      
      <motion.div 
        className="w-full max-w-md space-y-8 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div 
          className="text-center"
          variants={itemVariants}
        >
          <motion.div 
            className="mx-auto h-24 w-24 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 relative overflow-hidden"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <SparklesIcon className="h-12 w-12 text-white relative z-10" />
          </motion.div>
          <motion.h1 
            className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            إنشاء حساب جديد
          </motion.h1>
          <motion.p 
            className="text-purple-200 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            انضم إلى رحلتك في تعلم سيرة الرسول والصحابة
          </motion.p>
        </motion.div>

        <motion.div 
          className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden"
          variants={itemVariants}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
          
          <form className="space-y-7 relative z-10" onSubmit={handleSubmit}>
            <motion.div variants={itemVariants}>
              <div className="relative z-0 mb-6 group">
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block py-4 px-4 w-full text-sm bg-white/5 backdrop-blur-sm border-2 rounded-xl appearance-none text-white border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 peer transition-all duration-300 placeholder-transparent ${
                      errors.email ? 'border-red-500/50 focus:ring-red-400/50 focus:border-red-400' : ''
                    }`}
                    placeholder=" "
                  />
                  <label 
                    htmlFor="email" 
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-4 scale-75 top-4 right-4 origin-[0] peer-focus:text-purple-300 peer-focus:scale-75 peer-focus:-translate-y-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0"
                  >
                    البريد الإلكتروني
                  </label>
                  <div className="absolute left-4 top-4 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p 
                      className="mt-2 text-sm text-red-300 flex items-center bg-red-500/10 backdrop-blur-sm rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <XCircleIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="relative z-0 mb-6 group">
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block py-4 px-4 w-full text-sm bg-white/5 backdrop-blur-sm border-2 rounded-xl appearance-none text-white border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 peer transition-all duration-300 placeholder-transparent pr-12 ${
                      errors.password ? 'border-red-500/50 focus:ring-red-400/50 focus:border-red-400' : ''
                    }`}
                    placeholder=" "
                  />
                  <label 
                    htmlFor="password" 
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-4 scale-75 top-4 right-4 origin-[0] peer-focus:text-purple-300 peer-focus:scale-75 peer-focus:-translate-y-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0"
                  >
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-4 text-gray-400 hover:text-purple-300 transition-colors duration-200"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p 
                      className="mt-2 text-sm text-red-300 flex items-center bg-red-500/10 backdrop-blur-sm rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <XCircleIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
                
                {/* Password strength indicator */}
                {formData.password && (
                  <motion.div 
                    className="mt-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-300">قوة كلمة المرور</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <motion.div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.strength < 40 ? 'bg-red-500' :
                          passwordStrength.strength < 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength.strength}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="relative z-0 mb-6 group">
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`block py-4 px-4 w-full text-sm bg-white/5 backdrop-blur-sm border-2 rounded-xl appearance-none text-white border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 peer transition-all duration-300 placeholder-transparent pr-12 ${
                      errors.confirmPassword ? 'border-red-500/50 focus:ring-red-400/50 focus:border-red-400' : ''
                    }`}
                    placeholder=" "
                  />
                  <label 
                    htmlFor="confirmPassword" 
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-4 scale-75 top-4 right-4 origin-[0] peer-focus:text-purple-300 peer-focus:scale-75 peer-focus:-translate-y-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0"
                  >
                    تأكيد كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-4 top-4 text-gray-400 hover:text-purple-300 transition-colors duration-200"
                    aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p 
                      className="mt-2 text-sm text-red-300 flex items-center bg-red-500/10 backdrop-blur-sm rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <XCircleIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                  {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <motion.p 
                      className="mt-2 text-sm text-green-300 flex items-center bg-green-500/10 backdrop-blur-sm rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <CheckCircleIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                      كلمات المرور متطابقة
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="relative z-0 mb-6 group">
                <div className="relative">
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={`block py-4 px-4 w-full text-sm bg-white/5 backdrop-blur-sm border-2 rounded-xl appearance-none text-white border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 peer transition-all duration-300 placeholder-transparent ${
                      errors.full_name ? 'border-red-500/50 focus:ring-red-400/50 focus:border-red-400' : ''
                    }`}
                    placeholder=" "
                  />
                  <label 
                    htmlFor="full_name" 
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-4 scale-75 top-4 right-4 origin-[0] peer-focus:text-purple-300 peer-focus:scale-75 peer-focus:-translate-y-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0"
                  >
                    الاسم الكامل
                  </label>
                  <div className="absolute left-4 top-4 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <AnimatePresence>
                  {errors.full_name && (
                    <motion.p 
                      className="mt-2 text-sm text-red-300 flex items-center bg-red-500/10 backdrop-blur-sm rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <XCircleIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                      {errors.full_name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {loading ? (
                  <div className="flex items-center relative z-10">
                    <LoadingSpinner size="small" />
                    <span className="mr-2">جاري إنشاء الحساب...</span>
                  </div>
                ) : (
                  <div className="flex items-center relative z-10">
                    <span>إنشاء حساب</span>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                )}
              </button>
            </motion.div>
          </form>

          <motion.div 
            className="mt-6 text-center"
            variants={itemVariants}
          >
            <p className="text-sm text-purple-200">
              لديك حساب بالفعل؟{' '}
              <Link 
                to="/login" 
                className="font-medium text-purple-300 hover:text-white transition-colors duration-200 underline underline-offset-2"
              >
                سجل الدخول هنا
              </Link>
            </p>
          </motion.div>
        </motion.div>

        <div className="space-y-6">
          {/* Features */}
          <motion.div 
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/10"
            variants={itemVariants}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-2 rounded-lg mr-2">
                <SparklesIcon className="w-5 h-5" />
              </div>
              مزايا الانضمام
            </h3>
            <ul className="space-y-3">
              {[
                { text: 'تتبع تقدمك التعليمي', icon: '📊', color: 'text-blue-400' },
                { text: 'الحصول على نقاط خبرة ومكافآت', icon: '🏆', color: 'text-yellow-400' },
                { text: 'حفظ القصص المفضلة', icon: '❤️', color: 'text-red-400' },
                { text: 'الوصول لمحتوى حصري', icon: '🔒', color: 'text-purple-400' },
                { text: 'مشاركة إنجازاتك مع الآخرين', icon: '👥', color: 'text-green-400' }
              ].map((feature, index) => (
                <motion.li 
                  key={index}
                  className="flex items-center text-gray-200"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className={`ml-3 text-xl ${feature.color}`}>{feature.icon}</span>
                  <span className="text-sm">{feature.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Terms */}
          <motion.div 
            className="text-center"
            variants={itemVariants}
          >
            <p className="text-xs text-gray-400">
              بإنشاء حساب، فإنك توافق على{' '}
              <Link 
                to="/terms" 
                className="text-purple-300 hover:text-white transition-colors duration-200 underline underline-offset-2"
              >
                الشروط والأحكام
              </Link>
              {' '}و{' '}
              <Link 
                to="/privacy" 
                className="text-purple-300 hover:text-white transition-colors duration-200 underline underline-offset-2"
              >
                سياسة الخصوصية
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Signup
