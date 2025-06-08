import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { favoritesAPI, moviesAPI, seriesAPI } from '../services/api';
import MovieCard from '../components/MovieCard';

const Favorites = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState({ movies: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadFavorites();
  }, [currentUser]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Favorileri getir
      const response = await favoritesAPI.getUserFavorites();
      console.log('Raw favorites response:', response);

      // API yanıtını kontrol et
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid favorites data received from API');
      }

      // Film ve dizileri ayrı ayrı getir
      const moviePromises = response.data
        .filter(item => item.contentType === 'MOVIE')
        .map(item => {
          console.log('Fetching movie with ID:', item.contentId);
          return moviesAPI.getById(item.contentId)
            .then(response => {
              console.log(`Successfully fetched movie ${item.contentId}:`, response.data);
              return response;
            })
            .catch(error => {
              console.error(`Error fetching movie ${item.contentId}:`, error);
              return null;
            });
        });

      const seriesPromises = response.data
        .filter(item => item.contentType === 'SERIES')
        .map(item => {
          console.log('Fetching series with ID:', item.contentId);
          return seriesAPI.getById(item.contentId)
            .then(response => {
              console.log(`Successfully fetched series ${item.contentId}:`, response.data);
              return response;
            })
            .catch(error => {
              console.error(`Error fetching series ${item.contentId}:`, error);
          return null;
            });
      });
      
      const [movieResults, seriesResults] = await Promise.all([
        Promise.all(moviePromises),
        Promise.all(seriesPromises)
      ]);

      console.log('Movie results:', movieResults);
      console.log('Series results:', seriesResults);

      const processedMovies = movieResults
        .filter(movie => movie !== null && movie.data)
        .map(movie => movie.data);

      const processedSeries = seriesResults
        .filter(series => series !== null && series.data)
        .map(series => series.data);

      console.log('Processed movies:', processedMovies);
      console.log('Processed series:', processedSeries);

      setFavorites({
        movies: processedMovies,
        series: processedSeries
      });
      
    } catch (error) {
      console.error('Error loading favorites:', error);
      setError(error.message || 'Failed to load favorites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (contentId, contentType) => {
    try {
      await favoritesAPI.remove(contentId, contentType);
      // Favorileri yeniden yükle
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove from favorites. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading your favorites...</h4>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4>Error</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadFavorites}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">My Favorites</h2>

      {/* Movies Section */}
      <div className="mb-5">
        <h3 className="mb-3">Movies</h3>
        {favorites.movies.length === 0 ? (
          <p className="text-muted">No favorite movies yet.</p>
        ) : (
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {favorites.movies.map((movie) => (
              <div key={movie.id} className="col">
                <div className="card h-100">
                  <img
                    src={movie.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
                    className="card-img-top"
                    alt={movie.title}
                    style={{ height: '300px', objectFit: 'cover' }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{movie.title}</h5>
                    <p className="card-text text-muted">
                      {movie.genre} • {new Date(movie.releaseDate).getFullYear()}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          console.log('Navigating to movie:', movie.id);
                          navigate(`/movies/${movie.id}`);
                        }}
                      >
                        View Details
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleRemoveFavorite(movie.id, 'MOVIE')}
                      >
                        Remove
                      </button>
                    </div>
        </div>
      </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Series Section */}
      <div className="mb-5">
        <h3 className="mb-3">TV Series</h3>
        {favorites.series.length === 0 ? (
          <p className="text-muted">No favorite series yet.</p>
        ) : (
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {favorites.series.map((series) => (
              <div key={series.id} className="col">
                <div className="card h-100">
                  <img
                    src={series.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
                    className="card-img-top"
                    alt={series.title}
                    style={{ height: '300px', objectFit: 'cover' }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{series.title}</h5>
                    <p className="card-text text-muted">
                      {series.genre} • {new Date(series.releaseDate).getFullYear()}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
            <button
              className="btn btn-primary"
                        onClick={() => {
                          console.log('Navigating to series:', series.id);
                          navigate(`/series/${series.id}`);
                        }}
                      >
                        View Details
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleRemoveFavorite(series.id, 'SERIES')}
            >
                        Remove
            </button>
          </div>
                  </div>
                </div>
            </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;