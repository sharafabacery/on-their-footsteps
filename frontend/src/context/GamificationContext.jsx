import React, { createContext, useContext, useReducer, useEffect } from 'react'

// Gamification Context
const GamificationContext = createContext()

// Action types
const ACTIONS = {
  SET_USER_LEVEL: 'SET_USER_LEVEL',
  ADD_XP: 'ADD_XP',
  COMPLETE_QUIZ: 'COMPLETE_QUIZ',
  UNLOCK_ACHIEVEMENT: 'UNLOCK_ACHIEVEMENT',
  UPDATE_STREAK: 'UPDATE_STREAK',
  SET_LEADERBOARD: 'SET_LEADERBOARD'
}

// Initial state
const initialState = {
  user: {
    level: 1,
    xp: 0,
    streak: 0,
    totalXP: 0,
    completedQuizzes: 0,
    achievements: [],
    badges: []
  },
  leaderboard: {
    daily: [],
    weekly: [],
    overall: []
  },
  categories: {
    'غزوات': { progress: 0, total: 10, unlocked: true },
    'تعاملات': { progress: 0, total: 8, unlocked: false },
    'سيرة': { progress: 0, total: 15, unlocked: true }
  },
  rewards: {
    available: [],
    redeemed: []
  }
}

// Reducer function
const gamificationReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER_LEVEL:
      return {
        ...state,
        user: {
          ...state.user,
          level: action.payload.level,
          xp: action.payload.xp
        }
      }
    
    case ACTIONS.ADD_XP:
      const newXP = state.user.xp + action.payload
      const newLevel = Math.floor(newXP / 100) + 1
      return {
        ...state,
        user: {
          ...state.user,
          xp: newXP,
          totalXP: state.user.totalXP + action.payload,
          level: newLevel
        }
      }
    
    case ACTIONS.COMPLETE_QUIZ:
      return {
        ...state,
        user: {
          ...state.user,
          completedQuizzes: state.user.completedQuizzes + 1
        }
      }
    
    case ACTIONS.UNLOCK_ACHIEVEMENT:
      return {
        ...state,
        user: {
          ...state.user,
          achievements: [...state.user.achievements, action.payload]
        }
      }
    
    case ACTIONS.UPDATE_STREAK:
      return {
        ...state,
        user: {
          ...state.user,
          streak: action.payload
        }
      }
    
    case ACTIONS.SET_LEADERBOARD:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          ...action.payload
        }
      }
    
    default:
      return state
  }
}

// Provider component
export const GamificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gamificationReducer, initialState)

  // Actions
  const addXP = (amount) => {
    dispatch({ type: ACTIONS.ADD_XP, payload: amount })
  }

  const completeQuiz = (quizId, score) => {
    dispatch({ type: ACTIONS.COMPLETE_QUIZ })
    dispatch({ type: ACTIONS.ADD_XP, payload: score * 10 })
  }

  const unlockAchievement = (achievement) => {
    dispatch({ type: ACTIONS.UNLOCK_ACHIEVEMENT, payload: achievement })
  }

  const updateStreak = (streak) => {
    dispatch({ type: ACTIONS.UPDATE_STREAK, payload: streak })
  }

  const unlockCategory = (categoryName) => {
    if (state.categories[categoryName]) {
      return {
        ...state.categories,
        [categoryName]: {
          ...state.categories[categoryName],
          unlocked: true
        }
      }
    }
    return state.categories
  }

  const getUserStats = () => {
    return {
      level: state.user.level,
      xp: state.user.xp,
      streak: state.user.streak,
      totalXP: state.user.totalXP,
      completedQuizzes: state.user.completedQuizzes,
      achievements: state.user.achievements,
      badges: state.user.badges
    }
  }

  const value = {
    ...state,
    dispatch,
    addXP,
    completeQuiz,
    unlockAchievement,
    updateStreak,
    unlockCategory,
    getUserStats
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  )
}

// Hook to use the context
export const useGamification = () => {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider')
  }
  return context
}

export { ACTIONS }
