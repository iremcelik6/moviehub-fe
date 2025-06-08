import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { moviesAPI, seriesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { currentUser } = useAuth();
  
  // State yönetimi
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('movies');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, connected, disconnected
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Component mount edildiğinde çalışır
  useEffect(() => {
    initializeApp();
  }, []);

  // Backend bağlantısı başarılı olduğunda içerik yükle
  useEffect(() => {
    if (backendStatus === 'connected') {
      loadContent();
    }
  }, [backendStatus]);

  // Tab değiştiğinde içerik yükle
  useEffect(() => {
    if (backendStatus === 'connected' && !loading) {
      loadContent();
    }
  }, [activeTab]);

  // DEBUG: State değişikliklerini izle
  useEffect(() => {
    console.log('=== 📊 STATE DEBUG ===');
    console.log('Movies array length:', movies.length);
    console.log('Series array length:', series.length);
    console.log('Movies first item:', movies[0]);
    console.log('Series first item:', series[0]);
    console.log('Current activeTab:', activeTab);
    console.log('Current loading:', loading);
    console.log('Current error:', error);
    console.log('Current backendStatus:', backendStatus);
    console.log('========================');
  }, [movies, series, activeTab, loading, error, backendStatus]);

  // Tema değişikliğini izle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }, [isDarkMode]);

  // Uygulamayı başlat
  const initializeApp = async () => {
    console.log('🚀 MovieHub application is starting...');
    try {
    await checkBackendConnection();
      if (backendStatus === 'connected') {
        // İlk yüklemede hem movies hem de series verilerini al
        console.log('Loading initial data...');
        const [moviesResponse, seriesResponse] = await Promise.all([
          moviesAPI.getAll(),
          seriesAPI.getAll()
        ]);

        if (moviesResponse.data && Array.isArray(moviesResponse.data)) {
          setMovies(moviesResponse.data);
        }

        if (seriesResponse.data && Array.isArray(seriesResponse.data)) {
          console.log('Setting initial series data:', seriesResponse.data);
          setSeries(seriesResponse.data);
        }

        await loadContent();
      }
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  // Backend bağlantısını kontrol et
  const checkBackendConnection = async () => {
    try {
      console.log('🔍 Checking backend connection...');
      setBackendStatus('checking');
      
      // Backend'e test isteği gönder
      const response = await fetch('http://localhost:8080/api/movies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

      if (response.ok) {
        console.log('✅ Backend connection successful');
        setBackendStatus('connected');
        setError('');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Backend connection error:', error.message);
      setBackendStatus('disconnected');
      setError(`Backend sunucusuna bağlanılamadı: ${error.message}`);
      setLoading(false);
    }
  };

  // İçerikleri veritabanından yükle
  const loadContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('=== 🔍 DEBUG: loadContent başladı ===');
      console.log('activeTab:', activeTab);
      console.log('backendStatus:', backendStatus);
      console.log('Current series state:', series);
      
      if (activeTab === 'movies') {
        console.log('🎬 Movies API çağrılıyor...');
        const response = await moviesAPI.getAll();
        
        console.log('=== 🎬 MOVIES API RESPONSE DEBUG ===');
        console.log('Response status:', response.status);
        console.log('Response data type:', typeof response.data);
        console.log('Response data is array:', Array.isArray(response.data));
        console.log('Response data length:', response.data?.length);
        console.log('First movie:', response.data?.[0]);
        console.log('First movie rating:', response.data?.[0]?.rating);
        console.log('Raw response data:', response.data);
        
        const moviesData = response.data;
        setMovies(Array.isArray(moviesData) ? moviesData : []);
        
        console.log(`✅ Movies state updated: ${moviesData?.length || 0} items`);
        
      } else {
        console.log('📺 Series API çağrılıyor...');
        const response = await seriesAPI.getAll();
        
        console.log('=== 📺 SERIES API RESPONSE DEBUG ===');
        console.log('Response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        console.log('Response data type:', typeof response.data);
        console.log('Response data is array:', Array.isArray(response.data));
        console.log('Response data length:', response.data?.length);
        console.log('First series rating:', response.data?.[0]?.rating);
        
        const seriesData = response.data;
        if (Array.isArray(seriesData)) {
          console.log('Setting series data:', seriesData);
          setSeries(seriesData);
          console.log(`✅ Series state updated: ${seriesData.length} items`);
        } else {
          console.error('❌ Series data is not an array:', seriesData);
          setSeries([]);
        }

        // Force a re-render after setting series data
        setTimeout(() => {
          console.log('Current series state:', series);
        }, 0);
      }
      
    } catch (error) {
      console.error('=== ❌ API ERROR DEBUG ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Full error object:', error);
      
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // API hatalarını yönet
  const handleApiError = (error) => {
    let errorMessage = 'An error occurred while loading data.';
    
    if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
      errorMessage = 'Could not connect to server. Make sure the backend application is running.';
      setBackendStatus('disconnected');
    } else if (error.response?.status === 404) {
      errorMessage = 'API endpoint not found. Check backend URLs.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error occurred. Check backend logs.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authorization error. You may need to log in.';
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    setError(errorMessage);
  };

  // Arama işlemi
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (backendStatus !== 'connected') {
      alert('No connection to backend server!');
      return;
    }
    
    if (!searchTerm.trim()) {
      // Boş arama - tüm içeriği tekrar yükle
      loadContent();
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log(`🔍 Searching for "${searchTerm}"...`);
      
      if (activeTab === 'movies') {
        const response = await moviesAPI.search(searchTerm);
        const searchResults = response.data;
        
        console.log(`🎬 "${searchTerm}" search: ${searchResults?.length || 0} movies found`);
        setMovies(Array.isArray(searchResults) ? searchResults : []);
        
      } else {
        const response = await seriesAPI.search(searchTerm);
        const searchResults = response.data;
        
        console.log(`📺 "${searchTerm}" search: ${searchResults?.length || 0} series found`);
        setSeries(Array.isArray(searchResults) ? searchResults : []);
      }
      
    } catch (error) {
      console.error('🔍❌ Search error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Tab değiştirme
  const handleTabChange = (tab) => {
    console.log(`📑 Tab changed: ${tab}`);
    setActiveTab(tab);
    setSearchTerm('');
    setError('');
  };

  // Yeniden dene
  const handleRetry = () => {
    console.log('🔄 Retrying...');
    setError('');
    checkBackendConnection();
  };

  // Arama temizle
  const clearSearch = () => {
    setSearchTerm('');
    loadContent();
  };

  // Mevcut içeriği güvenli şekilde al
  const getCurrentContent = () => {
    const content = activeTab === 'movies' ? movies : series;
    return Array.isArray(content) ? content : [];
  };

  const currentContent = getCurrentContent();

  const handleFavorite = async (contentId, contentType) => {
    if (!currentUser) {
      alert('Please login to add favorites!');
      return;
    }

    try {
      const api = contentType === 'movies' ? moviesAPI : seriesAPI;
      await api.toggleFavorite(contentId);
      loadContent();
    } catch (error) {
      console.error('Favorite operation failed:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  const getFilteredAndSortedContent = () => {
    const content = activeTab === 'movies' ? movies : series;
    
    // Filtreleme
    let filtered = content.filter(item => {
      const matchesGenre = !genreFilter || 
        item.genre?.toLowerCase().includes(genreFilter.toLowerCase());
      const matchesYear = !yearFilter || 
        new Date(item.releaseDate).getFullYear().toString() === yearFilter;
      return matchesGenre && matchesYear;
    });

    // Sıralama
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'releaseDate':
          valueA = new Date(a.releaseDate);
          valueB = new Date(b.releaseDate);
          break;
        case 'rating':
          // Önce averageRating'e bak, yoksa rating'e bak
          valueA = a.averageRating || a.rating || 0;
          valueB = b.averageRating || b.rating || 0;
          break;
        default:
          valueA = a[sortBy];
          valueB = b[sortBy];
      }

      // Null veya undefined değerleri en sona koy
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return filtered;
  };

  const getUniqueGenres = () => {
    const content = activeTab === 'movies' ? movies : series;
    const genres = new Set();
    content.forEach(item => {
      if (item.genre) {
        item.genre.split(',').forEach(g => genres.add(g.trim()));
      }
    });
    return Array.from(genres);
  };

  const getUniqueYears = () => {
    const content = activeTab === 'movies' ? movies : series;
    const years = new Set();
    content.forEach(item => {
      if (item.releaseDate) {
        years.add(new Date(item.releaseDate).getFullYear());
      }
    });
    return Array.isArray(years) ? years : [];
  };

  const filteredContent = getFilteredAndSortedContent();

  // Backend bağlantısı kontrol ediliyor
  if (backendStatus === 'checking') {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Checking...</span>
          </div>
          <h4>Checking Backend Connection...</h4>
          <p className="text-muted">Please wait</p>
        </div>
      </div>
    );
  }

  // Backend bağlantısı yok
  if (backendStatus === 'disconnected') {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4>🚨 Backend Connection Error</h4>
          <p>{error}</p>
          <hr />
          <div>
            <strong>Solution Steps:</strong>
            <ol className="mt-2">
              <li>Make sure the backend application is running: <code>./mvnw spring-boot:run</code></li>
              <li>Check if port 8080 is open: <code>http://localhost:8080</code></li>
              <li>Check database connection</li>
            </ol>
          </div>
          <button className="btn btn-primary mt-3" onClick={handleRetry}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Ana içerik render
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-primary text-white py-5 mb-4">
        <div className="container text-center">
          <h1 className="display-4 mb-4">🎬 Welcome to MovieHub</h1>
          <p className="lead mb-4">
            Discover the latest movie and series collection from our database
          </p>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="row justify-content-center">
            <div className="col-md-6">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder={`Search ${activeTab === 'movies' ? 'movies' : 'series'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-light" type="submit" disabled={loading}>
                  {loading ? '⏳' : '🔍'}
                </button>
                {searchTerm && (
                  <button 
                    className="btn btn-outline-light" 
                    type="button" 
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    ✖️
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="container">
        {/* Connection Status */}
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>✅ Connection Status:</strong> Database connection is active
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs nav-fill mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'movies' ? 'active' : ''}`}
              onClick={() => handleTabChange('movies')}
              disabled={loading}
            >
              🎬 Movies ({movies.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'series' ? 'active' : ''}`}
              onClick={() => handleTabChange('series')}
              disabled={loading}
            >
              📺 Series ({series.length})
            </button>
          </li>
        </ul>

        {/* Filtreleme ve Sıralama */}
        <div className="row mb-4">
          <div className="col-md-3">
            <select 
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="title">Sort by Title</option>
              <option value="releaseDate">Sort by Release Date</option>
              <option value="rating">Sort by Rating</option>
            </select>
          </div>
          <div className="col-md-2">
            <select 
              className="form-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select"
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
            >
              <option value="">All Genres</option>
              {getUniqueGenres().map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">All Years</option>
              {getUniqueYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="col-md-1">
            <button 
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setSortBy('title');
                setSortOrder('asc');
                setGenreFilter('');
                setYearFilter('');
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-warning" role="alert">
            <strong>⚠️ Warning:</strong> {error}
            <button className="btn btn-sm btn-outline-warning ms-2" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>📥 Loading data from database...</h5>
            <p className="text-muted">
              Fetching {activeTab === 'movies' ? 'movies' : 'series'}
            </p>
          </div>
        ) : (
          <>
            {/* Search Info */}
            {searchTerm && (
              <div className="alert alert-info">
                <strong>🔍 Search Results:</strong> {filteredContent.length} results found for "{searchTerm}"
              </div>
            )}

            {/* Content Grid */}
            {filteredContent.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-4">
                  {searchTerm ? '🔍' : '📭'}
                </div>
                <h4>
                  {searchTerm 
                    ? `No results found for "${searchTerm}"` 
                    : `No ${activeTab === 'movies' ? 'movies' : 'series'} added yet`
                  }
                </h4>
                <p className="text-muted">
                  {searchTerm 
                    ? 'You can try different keywords.' 
                    : 'Waiting for content to be added to the database.'
                  }
                </p>
                {searchTerm && (
                  <button className="btn btn-primary" onClick={clearSearch}>
                    Show All {activeTab === 'movies' ? 'Movies' : 'Series'}
                  </button>
                )}
              </div>
            ) : (
              <div className="row">
                {filteredContent.map((item) => (
                  <div key={item.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <div className="card h-100 shadow-sm">
                      {/* Poster Image */}
                      <div className="position-relative">
                        <img
                          src={item.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
                          className="card-img-top"
                          alt={item.title}
                          style={{ height: '300px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x450?text=No+Image';
                          }}
                        />
                        {/* Database Badge */}
                        <span className="position-absolute top-0 start-0 badge bg-success m-2">
                          DB
                        </span>
                      </div>
                      
                      {/* Card Body */}
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title" title={item.title}>
                          {item.title}
                        </h5>
                        
                        <div className="mb-2">
                          <small className="text-muted">
                            <strong>{item.genre}</strong>
                          </small>
                          <br />
                          <small className="text-muted">
                            📅 {new Date(item.releaseDate).getFullYear()}
                            {activeTab === 'movies' && item.duration && (
                              <> • ⏱️ {item.duration} dk</>
                            )}
                            {activeTab === 'series' && (
                              <> • 📺 {item.seasons}S/{item.episodes}E</>
                            )}
                          </small>
                          {activeTab === 'movies' && item.director && (
                            <>
                              <br />
                              <small className="text-muted">
                                🎬 Director: {item.director}
                              </small>
                            </>
                          )}
                          {item.rating && (
                            <>
                              <br />
                              <small className="text-muted">
                                ⭐ Rating: {item.rating}/10
                              </small>
                            </>
                          )}
                          {item.averageRating && (
                            <>
                              <br />
                              <small className="text-muted">
                                ⭐ Average Rating: {item.averageRating.toFixed(1)}/10
                                {item.ratingCount && ` (${item.ratingCount} ratings)`}
                              </small>
                            </>
                          )}
                        </div>

                        <p className="card-text flex-grow-1">
                          {item.description && item.description.length > 120
                            ? item.description.substring(0, 120) + '...'
                            : item.description || 'No description available.'}
                        </p>
                        
                        {/* Actions */}
                        <div className="mt-auto">
                          <div className="d-flex justify-content-center">
                            <Link
                              to={`/${activeTab}/${item.id}`}
                              className="btn btn-primary w-100"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer Info */}
        <div className="text-center mt-5 py-4 border-top">
          <small className="text-muted">
            📊 Total: {movies.length} Movies, {series.length} Series | 
            🔗 Backend: Active | 
            📡 Real-time Data
          </small>
        </div>
      </div>
    </div>
  );
};

export default Home;