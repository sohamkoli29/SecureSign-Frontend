import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import axios from '../utils/axios';

const AuthCallback = ({ setUser }) => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (typeof setUser !== 'function') {
      console.error('AuthCallback: setUser prop must be a function');
      setError('Application configuration error. Please contact support.');
      setIsProcessing(false);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the session from Supabase after OAuth redirect
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        setError('No session found. Please try logging in again.');
        setIsProcessing(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // Get user data from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error('No user data found');
      }

      console.log('Supabase user:', user); // Debug log

      // Try to sync with backend
      try {
        const response = await axios.post(`${API_URL}/api/auth/google-callback`, {
          supabase_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                'User',
          avatar_url: user.user_metadata?.avatar_url || 
                     user.user_metadata?.picture || 
                     null,
          provider: 'google',
        });

        console.log('Backend response:', response.data); // Debug log

        if (response.data.success) {
          // Store backend token and user data
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          localStorage.setItem('supabase_session', JSON.stringify(session));
          localStorage.setItem('auth_mode', 'jwt'); // Using JWT mode
          
          setUser(response.data.data.user);
          navigate('/dashboard');
        } else {
          throw new Error('Backend sync failed: ' + (response.data.error || 'Unknown error'));
        }
      } catch (backendError) {
        console.error('Backend sync error details:', {
          message: backendError.message,
          response: backendError.response?.data,
          status: backendError.response?.status
        });
        
        // If backend fails (500 error), use Supabase fallback
        if (backendError.response?.status === 500) {
          const userData = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email?.split('@')[0] || 
                  'User',
            avatar_url: user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture || 
                       null,
            auth_provider: 'google'
          };
          
          // Use Supabase access token as the token
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('supabase_session', JSON.stringify(session));
          localStorage.setItem('auth_mode', 'supabase'); // Using Supabase mode
          
          setUser(userData);
          
          setError('Account created but profile sync failed. Some features may be limited.');
          setIsProcessing(false);
          setTimeout(() => navigate('/dashboard'), 3000);
        } else {
          // Other errors (network, etc.)
          throw backendError;
        }
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
      setIsProcessing(false);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {error ? (
          <div className="text-center">
            <svg 
              className="w-16 h-16 text-red-500 mx-auto mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error.includes('profile sync failed') ? 'Partial Success' : 'Authentication Failed'}
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              {error.includes('profile sync failed') ? 'Redirecting to dashboard...' : 'Redirecting to login...'}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Completing Sign In</h2>
            <p className="text-gray-600">Please wait while we set up your account...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;