import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 Request with token:', token.substring(0, 20) + '...');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('🔄 Received 401, checking auth mode...');
      const authMode = localStorage.getItem('auth_mode');
      
      if (authMode === 'supabase') {
        // In Supabase mode, try to refresh Supabase session
        try {
          const { supabase } = await import('./supabaseClient');
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && session) {
            console.log('✅ Refreshed Supabase session');
            localStorage.setItem('token', session.access_token);
            localStorage.setItem('supabase_session', JSON.stringify(session));
            
            error.config.headers.Authorization = `Bearer ${session.access_token}`;
            return axiosInstance(error.config);
          }
        } catch (refreshError) {
          console.error('Failed to refresh Supabase session:', refreshError);
        }
      } else {
        // In JWT mode, try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
              refreshToken
            });
            
            if (response.data.success) {
              console.log('✅ Refreshed JWT token');
              localStorage.setItem('token', response.data.data.token);
              localStorage.setItem('refreshToken', response.data.data.refreshToken);
              
              error.config.headers.Authorization = `Bearer ${response.data.data.token}`;
              return axiosInstance(error.config);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
      }
      
      // If all refresh attempts fail, logout
      console.log('❌ All auth attempts failed, logging out');
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;