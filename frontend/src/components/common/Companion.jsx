import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Companion.css';

const Companion = ({ position = 'bottom-right' }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const companionCharacters = {
    1: { emoji: '🦉', name: 'نورة البومة', personality: 'wise' },
    2: { emoji: '🦅', name: 'زيد الصقر', personality: 'brave' },
    3: { emoji: '🦌', name: 'ليلى الغزالة', personality: 'gentle' }
  };

  const messages = {
    wise: [
      "أحسنت! استمر في التعلم 📚",
      "معرفة جديدة رائعة! 🌟",
      "أنا فخور بك! 💪",
      "استمر، أنت تفعل بشكل رائع! 🎯",
      "كل يوم تعلم جديد هو إنجاز! 🏆"
    ],
    brave: [
      "هيا بنا! استمر للمغامرة التالية! 🚀",
      "أنت شجاع! لا تتوقف الآن! ⚡",
      "ممتاز! استمر في القتال! 🗡️",
      "أنت بطل! استمر للمستوى التالي! 🏅",
      "شجاعتك ملهمة! 💫"
    ],
    gentle: [
      "أنت رائع! استمر بلطف 🌸",
      "تعلمك جميل جداً! 🌺",
      "أنا سعيد بتقدمك! 😊",
      "استمر بهدوء، أنت تفعل بشكل جيد! 🌷",
      "روعتك الجميلة تلمع! ✨"
    ]
  };

  useEffect(() => {
    if (!user || !user.companion_character_id) return;

    const companion = companionCharacters[user.companion_character_id];
    if (!companion) return;

    // Show welcome message when component mounts
    const welcomeMessages = {
      wise: `مرحباً! أنا ${companion.name}، سأساعدك في رحلتك التعليمية! 🦉`,
      brave: `يا سلام! أنا ${companion.name}، جاهز للمغامرة معاً! 🦅`,
      gentle: `أهلاً بك! أنا ${companion.name}، سأكون رفيقك اللطيف! 🦌`
    };

    setMessage(welcomeMessages[companion.personality]);

    // Show random encouragement messages every 30 seconds
    const interval = setInterval(() => {
      const personalityMessages = messages[companion.personality];
      const randomMessage = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];
      setMessage(randomMessage);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleClick = () => {
    if (!user || !user.companion_character_id) return;

    const companion = companionCharacters[user.companion_character_id];
    if (!companion) return;

    const personalityMessages = messages[companion.personality];
    const randomMessage = personalityMessages[Math.floor(Math.random() * personalityMessages.length)];
    setMessage(randomMessage);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (!user || !user.companion_character_id || user.is_guest) {
    return null; // Don't show companion for guest users
  }

  const companion = companionCharacters[user.companion_character_id];
  if (!companion) return null;

  return (
    <div className={`companion-container ${position} ${isVisible ? 'visible' : 'hidden'}`}>
      <div 
        className={`companion ${isAnimating ? 'animate' : ''}`}
        onClick={handleClick}
        title={`${companion.name} - انقر للتشجيع!`}
      >
        <div className="companion-avatar">
          {companion.emoji}
        </div>
        
        {message && (
          <div className="companion-message">
            <div className="message-bubble">
              {message}
            </div>
            <div className="message-tail"></div>
          </div>
        )}
      </div>

      <button 
        className="companion-toggle"
        onClick={toggleVisibility}
        title={isVisible ? 'إخفاء المرافق' : 'إظهار المرافق'}
      >
        {isVisible ? '👁️‍🗨️' : '👁️'}
      </button>
    </div>
  );
};

export default Companion;
