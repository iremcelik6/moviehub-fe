import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// API instance oluştur
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye timeout
});

// Request interceptor - her istekte token ekle ve log
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - yanıtları logla ve hataları yakala
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url} - ${response.data?.length || 'N/A'} items`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;
    
    console.error(`❌ API Error: ${status} ${url}`, errorData || error.message);
    
    // Sadece gerçek auth hatalarında session'ı temizle
    if ((status === 401 || status === 403) && 
        errorData?.message?.toLowerCase().includes('expired') || 
        errorData?.message?.toLowerCase().includes('invalid token')) {
      console.warn('🔐 Token expired or invalid, clearing session...');
      
      // Token'ı temizle
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      
      // Login sayfasına yönlendir (sadece auth gerekli sayfalarda)
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        //alert('Your session has expired. Please login again.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      // Yetki hatası - session'ı temizleme, sadece uyarı göster
      console.warn('⚠️ Permission denied for this operation');
      //alert('You do not have permission to perform this action.');
    }
    
    return Promise.reject(error);
  }
);

// Movies API
export const moviesAPI = {
  // Tüm filmleri getir
  getAll: () => {
    console.log('📥 Tüm filmler getiriliyor...');
    return api.get('/movies');
  },
  
  // ID ile film getir
  getById: (id) => {
    console.log(`📥 Film getiriliyor: ID ${id}`);
    return api.get(`/movies/${id}`);
  },
  
  // Başlık ile film ara
  search: (title) => {
    console.log(`🔍 Film araması: "${title}"`);
    return api.get(`/movies/search?title=${encodeURIComponent(title)}`);
  },
  
  // Türe göre film getir
  getByGenre: (genre) => {
    console.log(`📥 Türe göre filmler: "${genre}"`);
    return api.get(`/movies/genre/${encodeURIComponent(genre)}`);
  },
  
  // Yeni film oluştur (Admin)
  create: (movie) => {
    console.log('➕ Yeni film oluşturuluyor:', movie.title);
    return api.post('/movies', movie);
  },
  
  // Film güncelle (Admin)
  update: (id, movie) => {
    console.log(`✏️ Film güncelleniyor: ID ${id}`);
    return api.put(`/movies/${id}`, movie);
  },
  
  // Film sil (Admin)
  delete: (id) => {
    console.log(`🗑️ Film siliniyor: ID ${id}`);
    return api.delete(`/movies/${id}`);
  }
};

// Series API
export const seriesAPI = {
  // Tüm dizileri getir
  getAll: () => {
    console.log('📥 Tüm diziler getiriliyor...');
    return api.get('/series');
  },
  
  // ID ile dizi getir
  getById: (id) => {
    console.log(`📥 Dizi getiriliyor: ID ${id}`);
    return api.get(`/series/${id}`);
  },
  
  // Başlık ile dizi ara
  search: (title) => {
    console.log(`🔍 Dizi araması: "${title}"`);
    return api.get(`/series/search?title=${encodeURIComponent(title)}`);
  },
  
  // Türe göre dizi getir
  getByGenre: (genre) => {
    console.log(`📥 Türe göre diziler: "${genre}"`);
    return api.get(`/series/genre/${encodeURIComponent(genre)}`);
  },
  
  // Yeni dizi oluştur (Admin)
  create: (series) => {
    console.log('➕ Yeni dizi oluşturuluyor:', series.title);
    return api.post('/series', series);
  },
  
  // Dizi güncelle (Admin)
  update: (id, series) => {
    console.log(`✏️ Dizi güncelleniyor: ID ${id}`);
    return api.put(`/series/${id}`, series);
  },
  
  // Dizi sil (Admin)
  delete: (id) => {
    console.log(`🗑️ Dizi siliniyor: ID ${id}`);
    return api.delete(`/series/${id}`);
  }
};

// Auth API
export const authAPI = {
  // Kullanıcı girişi
  login: (credentials) => {
    console.log('🔐 Kullanıcı girişi:', credentials.username);
    return api.post('/auth/login', credentials);
  },
  
  // Kullanıcı kaydı
  register: (userData) => {
    console.log('📝 Yeni kullanıcı kaydı:', userData.username);
    return api.post('/auth/register', userData);
  }
};

// Reviews API
export const reviewsAPI = {
  // İçerik yorumlarını getir
  getByContent: (contentId, contentType) => {
    console.log(`📥 Getting reviews for: ${contentType} ID ${contentId}`);
    return api.get(`/reviews/content/${contentId}/${contentType}`);
  },
  
  // Kullanıcı yorumlarını getir
  getByUser: (userId) => {
    console.log(`📥 Getting user reviews: ID ${userId}`);
    return api.get(`/reviews/user/${userId}`);
  },
  
  // Yeni yorum ekle
  create: (review) => {
    console.log('➕ Adding new review:', review.contentType, review.contentId);
    return api.post('/reviews', review);
  },
  
  // Yorum sil
  delete: async (reviewId) => {
    console.log(`🗑️ Deleting review: ID ${reviewId}`);
    try {
      const response = await api.delete(`/reviews/${reviewId}`);
      console.log('✅ Review deleted successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to delete review:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Kullanıcı yorumlarını getir
  getReviewUser: (reviewId) => {
    console.log(`📥 Getting review user: ID ${reviewId}`);
    return api.get(`/reviews/${reviewId}/user`)
      .then(response => {
        console.log(`✅ User info received for review ${reviewId}:`, response.data);
        return response;
      })
      .catch(error => {
        console.error(`❌ Error getting user info for review ${reviewId}:`, error.response?.data || error.message);
        throw error;
      });
  }
};

// Ratings API
export const ratingsAPI = {
  // İçerik puanlarını getir
  getContentRating: (contentId, contentType) => {
    console.log(`📊 Puanlar getiriliyor: ${contentType} ID ${contentId}`);
    return api.get(`/ratings/content/${contentId}/${contentType}`);
  },
  
  // Kullanıcının puanını getir
  getUserRating: (contentId, contentType) => {
    console.log(`👤 Kullanıcı puanı: ${contentType} ID ${contentId}`);
    return api.get(`/ratings/user/${contentId}/${contentType}`);
  },
  
  // Puan ver veya güncelle
  createOrUpdate: (rating) => {
    console.log(`⭐ Puan veriliyor: ${rating.contentType} ID ${rating.contentId} - ${rating.score}/10`);
    return api.post('/ratings', rating);
  }
};

// Favorites API
export const favoritesAPI = {
  // Kullanıcı favorilerini getir
  getUserFavorites: async () => {
    console.log('📥 Getting user favorites...');
    try {
      const response = await api.get('/favorites');
      console.log('✅ Favorites loaded successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Failed to load favorites:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Favorilere ekle
  add: async (contentId, contentType) => {
    console.log(`❤️ Adding to favorites: ${contentType} ID ${contentId}`);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await api.post('/favorites', { contentId, contentType });
      console.log('✅ Added to favorites successfully');
      return response;
    } catch (error) {
      // Yetki hatası durumunda özel mesaj
      if (error.response?.status === 403) {
        //throw new Error('You do not have permission to add favorites');
      }
      console.error('❌ Failed to add to favorites:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Favorilerden çıkar
  remove: async (contentId, contentType) => {
    console.log(`💔 Removing from favorites: ${contentType} ID ${contentId}`);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await api.delete(`/favorites/${contentId}/${contentType}`);
      console.log('✅ Removed from favorites successfully');
      return response;
    } catch (error) {
      // Yetki hatası durumunda özel mesaj
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to remove favorites');
      }
      console.error('❌ Failed to remove from favorites:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Favori kontrolü
  check: async (contentId, contentType) => {
    console.log(`❓ Checking favorite status: ${contentType} ID ${contentId}`);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { data: { isFavorite: false } };
      }
      
      const response = await api.get(`/favorites/check/${contentId}/${contentType}`);
      console.log('✅ Favorite status checked:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Failed to check favorite status:', error.response?.data || error.message);
      return { data: { isFavorite: false } };
    }
  }
};

// Utility functions
export const apiUtils = {
  // Backend sağlık kontrolü
  healthCheck: async () => {
    try {
      console.log('🏥 Backend sağlık kontrolü...');
      const response = await fetch(`${API_BASE_URL}/actuator/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Backend sağlık kontrolü başarısız:', error);
      return false;
    }
  },
  
  // Basit bağlantı testi
  testConnection: async () => {
    try {
      console.log('🔗 Backend bağlantı testi...');
      const response = await api.get('/movies', { timeout: 3000 });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Bağlantı testi başarısız:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// DEBUG fonksiyonları
export const debugAPI = {
  // Manuel movies test
  testMoviesDirectly: async () => {
    try {
      console.log('🧪 Direct Movies API Test başlıyor...');
      
      // Direkt fetch ile test
      const response = await fetch('http://localhost:8080/api/movies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('=== DIRECT API TEST RESULTS ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const text = await response.text();
      console.log('Response text length:', text.length);
      console.log('Response text preview:', text.substring(0, 200));
      
      // JSON parse dene
      try {
        const json = JSON.parse(text);
        console.log('✅ JSON parsed successfully');
        console.log('Parsed data type:', typeof json);
        console.log('Is array:', Array.isArray(json));
        console.log('Array length:', json.length);
        console.log('First item:', json[0]);
        return { success: true, data: json };
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError);
        return { success: false, error: 'JSON parse failed', raw: text };
      }
      
    } catch (error) {
      console.error('❌ Direct API test hatası:', error);
      return { success: false, error: error.message };
    }
  },

  // Backend endpoint'lerini test et
  testAllEndpoints: async () => {
    const endpoints = [
      '/movies',
      '/series',
      '/movies/1',
      '/series/1'
    ];
    
    console.log('🧪 Testing all endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:8080/api${endpoint}`);
        console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message} ❌`);
      }
    }
  }
};

const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh');
    localStorage.setItem('token', response.data.token);
    return response.data.token;
  } catch (error) {
    throw error;
  }
};

const handleFavoriteError = (error) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    //alert('Your session has expired. Please login again.');
    // State'i sıfırla
    setIsFavorite(false);
  } else {
    //alert('Failed to update favorites. Please try again.');
  }
};

export default api;