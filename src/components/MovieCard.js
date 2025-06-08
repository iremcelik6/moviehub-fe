import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoritesAPI, ratingsAPI } from '../services/api';

const MovieCard = ({ movie, type = 'movie' }) => {
  const { currentUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });

  useEffect(() => {
    // Rating bilgisini getir
    ratingsAPI.getContentRating(movie.id, type.toUpperCase())
      .then(response => {
        setRating(response.data);
      })
      .catch(error => console.error('Rating yüklenemedi:', error));

    // Favori durumunu kontrol et
    if (currentUser) {
      favoritesAPI.check(movie.id, type.toUpperCase())
        .then(response => {
          setIsFavorite(response.data.isFavorite);
        })
        .catch(error => console.error('Favori durumu kontrol edilemedi:', error));
    }
  }, [movie.id, type, currentUser]);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please login to add favorites!');
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!isFavorite); // Optimistic update

    try {
      if (previousState) {
        await favoritesAPI.remove(movie.id, type.toUpperCase());
        console.log('Removed from favorites');
      } else {
        await favoritesAPI.add(movie.id, type.toUpperCase());
        console.log('Added to favorites');
      }
    } catch (error) {
      console.error('Favorite operation failed:', error);
      setIsFavorite(previousState); // Revert on error
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Your session has expired. Please login again.');
      } else {
        alert('Failed to update favorites. Please try again.');
      }
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="rating-stars">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="rating-stars">☆</span>);
    }
    
    while (stars.length < 5) {
      stars.push(<span key={stars.length} className="text-muted">☆</span>);
    }
    
    return stars;
  };

  const linkTo = type === 'movie' ? `/movie/${movie.id}` : `/series/${movie.id}`;

  return (
    <div className="card h-100">
      <div className="position-relative">
        <img
          src={movie.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
          className="card-img-top movie-poster"
          alt={movie.title}
        />
        {currentUser && (
          <button
            className="favorite-btn"
            onClick={toggleFavorite}
            title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{movie.title}</h5>
        <p className="card-text text-muted small mb-2">
          {movie.genre} | {new Date(movie.releaseDate).getFullYear()}
        </p>
        
        <div className="mb-2">
          {renderStars(rating.averageRating)}
          <small className="text-muted ms-2">
            ({rating.averageRating.toFixed(1)}) - {rating.ratingCount} ratings
          </small>
        </div>
        
        <p className="card-text">
          {movie.description?.length > 100
            ? movie.description.substring(0, 100) + '...'
            : movie.description}
        </p>
        
        <div className="mt-auto">
          <Link to={linkTo} className="btn btn-primary w-100">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;