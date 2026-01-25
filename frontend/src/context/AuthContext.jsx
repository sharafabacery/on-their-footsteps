import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, authService = new AuthService() }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Validate existing session
          const result = await authService.validateSession();
          if (result.success) {
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);
          } else {
            // Invalid session, clear it
            await authService.logout();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [authService]);

  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const result = await authService.login(credentials);
      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authService]);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const result = await authService.register(userData);
      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authService]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      // Even if logout API fails, clear local state
      setUser(null);
      setError(null);
      return { success: true };
    }
  }, [authService]);

  const updateProfile = useCallback(async (profileData) => {
    setError(null);
    try {
      const result = await authService.updateProfile(profileData);
      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authService]);

  const refreshToken = useCallback(async () => {
    try {
      const result = await authService.refreshToken();
      if (result.success) {
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Token refresh failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,
    
    // Methods
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}