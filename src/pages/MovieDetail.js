import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moviesAPI, reviewsAPI, ratingsAPI, favoritesAPI } from '../services/api';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State yönetimi
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });
  const [userRating, setUserRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      loadMovieDetails();
    }
  }, [id]);

  // Film detaylarını yükle
  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log(`🎬 Loading movie details for ID: ${id}`);
      
      // Film bilgilerini getir
      const movieResponse = await moviesAPI.getById(id);
      const movieData = movieResponse.data;
      setMovie(movieData);
      
      console.log('✅ Movie loaded:', movieData.title);
      
      // Yorumları getir
      const reviewsResponse = await reviewsAPI.getByContent(id, 'MOVIE');
      console.log('Raw reviews response:', reviewsResponse.data);
      
      // Review'ları işle
      const processedReviews = reviewsResponse.data.map(review => ({
        ...review,
        user: {
          id: review.userId || null,
          username: review.username || 'Anonymous User'
        }
      }));
      
      console.log('Processed reviews:', processedReviews);
      setReviews(processedReviews);
      
      // Ortalama puanı getir
      const ratingResponse = await ratingsAPI.getContentRating(id, 'MOVIE');
      console.log('Rating response:', ratingResponse);
      
      if (ratingResponse && ratingResponse.data) {
        setRating(ratingResponse.data);
      } else {
        setRating({ averageRating: 0, ratingCount: 0 });
      }
      
      if (currentUser) {
        // Kullanıcının puanını getir
        try {
          const userRatingResponse = await ratingsAPI.getUserRating(id, 'MOVIE');
          console.log('User rating response:', userRatingResponse);
          
          if (userRatingResponse && userRatingResponse.data) {
            setUserRating(userRatingResponse.data.score);
          } else {
            setUserRating(0);
          }
        } catch (error) {
          console.log('No user rating found, setting to 0');
          setUserRating(0);
        }
        
        // Favori durumunu kontrol et
        const favoriteResponse = await favoritesAPI.check(id, 'MOVIE');
        setIsFavorite(favoriteResponse.data.isFavorite);
      }
      
    } catch (error) {
      console.error('❌ Movie details loading error:', error);
      
      if (error.response?.status === 404) {
        setError('Movie not found.');
      } else {
        setError(`Error loading movie details: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Puan verme
  const handleRating = async (score) => {
    if (!currentUser) {
      alert('You must be logged in to rate movies!');
      return;
    }

    try {
      console.log(`⭐ Rating movie: ${score}/10`);
      
      const ratingData = {
        contentId: parseInt(id),
        contentType: 'MOVIE',
        score: score,
        userId: currentUser.id
      };
      
      console.log('Rating data being sent:', ratingData);
      
      // Rating'i gönder ve yanıtı bekle
      const response = await ratingsAPI.createOrUpdate(ratingData);
      console.log('Rating API Response:', response);

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Önce state'i güncelle
      setUserRating(score);
      
      // Sonra ortalama puanı güncelle
      const ratingResponse = await ratingsAPI.getContentRating(id, 'MOVIE');
      console.log('Updated rating response:', ratingResponse);
      
      if (ratingResponse && ratingResponse.data) {
        setRating(ratingResponse.data);
      } else {
        setRating({ averageRating: score, ratingCount: 1 });
      }
      
      console.log('✅ Rating updated successfully');
      
    } catch (error) {
      console.error('❌ Rating error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'An error occurred while rating the movie. ';
      
      if (error.response?.status === 401) {
        errorMessage += 'Your session has expired. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage += 'You do not have permission to rate this movie.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      //alert(errorMessage);
      
      // Hata durumunda state'i geri al
      setUserRating(score);
    }
  };

  // Favorilere ekleme/çıkarma
  const toggleFavorite = async () => {
    if (!currentUser) {
      alert('You must be logged in to add favorites!');
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!isFavorite); // Optimistic update

    try {
      if (previousState) {
        await favoritesAPI.remove(id, 'MOVIE');
        console.log('💔 Removed from favorites');
      } else {
        await favoritesAPI.add(id, 'MOVIE');
        console.log('❤️ Added to favorites');
      }
    } catch (error) {
      console.error('❌ Favorite toggle error:', error);
      //setIsFavorite(previousState); // Revert on error
      
      if (error.response?.status === 401 || error.response?.status === 403) {
       // alert('Your session has expired. Please login again.');
      } else {
        //alert('Failed to update favorites. Please try again.');
      }
    }
  };

  // Yorum ekleme
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('You must be logged in to write reviews!');
      return;
    }

    if (!newReview.trim()) {
      alert('Please write a review before submitting.');
      return;
    }

    try {
      setSubmittingReview(true);
      console.log('💬 Submitting review...');
      
      // Backend'e gönder
      const response = await reviewsAPI.create({
        contentId: parseInt(id),
        contentType: 'MOVIE',
        content: newReview.trim(),
        userId: currentUser.id,
        username: currentUser.username
      });

      // Backend'den gelen review'u user bilgileriyle birlikte al
      if (response.data) {
        const reviewWithUser = {
          ...response.data,
          user: {
            id: currentUser.id,
            username: currentUser.username
          }
        };
        
        // Yeni review'u listeye ekle
        setReviews(prevReviews => [reviewWithUser, ...prevReviews]);
        setNewReview('');
        console.log('✅ Review submitted successfully with user info:', reviewWithUser);
      }
      
    } catch (error) {
      console.error('❌ Review submission error:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Yorum silme
  const deleteReview = async (reviewId) => {
    if (!reviewId) {
      console.error('❌ No review ID provided for deletion');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    const previousReviews = [...reviews]; // Mevcut yorumları sakla

    try {
      console.log(`🗑️ Attempting to delete review with ID: ${reviewId}`);
      
      // Optimistic update - yorumu hemen listeden kaldır
      setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
      
      // Backend'e silme isteği gönder
      const response = await reviewsAPI.delete(Number(reviewId));
      
      if (response.status === 200 || response.status === 204) {
        console.log('✅ Review deleted successfully');
      } else {
        throw new Error('Unexpected response status');
      }
      
    } catch (error) {
      console.error('❌ Review deletion error:', error.response?.data || error.message);
      
      // Hata durumunda önceki state'e geri dön
      setReviews(previousReviews);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Your session has expired. Please login again.');
      } else if (error.response?.status === 404) {
        console.error('Review not found. ID:', reviewId);
        alert('The review could not be found. It may have been already deleted.');
      } else {
        alert(`Failed to delete the review: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // Yıldız puanlama componenti
  const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <span
            key={value}
            className={`fs-4 ${
              value <= (hoverRating || rating) ? 'text-warning' : 'text-muted'
            }`}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
            onClick={() => !readOnly && onRatingChange && onRatingChange(value)}
            onMouseEnter={() => !readOnly && setHoverRating(value)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          >
            ★
          </span>
        ))}
        <span className="ms-2 align-self-center">
          {rating}/10
        </span>
      </div>
    );
  };

  // Loading durumu
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading movie details...</h4>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4>Error</h4>
          <p>{error}</p>
          <button className="btn btn-primary me-2" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
          <button className="btn btn-outline-primary" onClick={loadMovieDetails}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Film bulunamadı
  if (!movie) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          <h4>Movie Not Found</h4>
          <p>The requested movie could not be found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Back Button */}
      <div className="mb-3">
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/')}
        >
          ← Back to Movies
        </button>
      </div>

      <div className="row">
        {/* Movie Poster */}
        <div className="col-md-4">
          <img
            src={movie.posterUrl || 'https://via.placeholder.com/400x600?text=No+Image'}
            alt={movie.title}
            className="img-fluid rounded shadow"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x600?text=No+Image';
            }}
          />
        </div>
        
        {/* Movie Info */}
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1 className="display-5">{movie.title}</h1>
              <p className="text-muted mb-0">
                {movie.genre} • {movie.duration} min • {new Date(movie.releaseDate).getFullYear()}
              </p>
              {movie.director && (
                <p className="text-muted">
                  <strong>Director:</strong> {movie.director}
                </p>
              )}
            </div>
            
            {/* Favorite Button */}
            {currentUser && (
              <button
                className={`btn ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={toggleFavorite}
              >
                {isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
              </button>
            )}
          </div>
          
          {/* Rating Section */}
          <div className="mb-4">
            <h5>User Ratings</h5>
            <div className="mb-2">
              <div className="d-flex align-items-center">
                <span className="me-2">Average Rating:</span>
                <StarRating rating={rating.averageRating} readOnly />
                <span className="ms-2">({rating.ratingCount} ratings)</span>
              </div>
            </div>
            
            {currentUser && (
              <div className="mt-3">
                <div className="d-flex align-items-center">
                  <span className="me-2">Your Rating:</span>
                  <StarRating rating={userRating} onRatingChange={handleRating} />
                </div>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <h5>Synopsis</h5>
            <p className="lead">
              {movie.description || 'No description available for this movie.'}
            </p>
          </div>

          <div className="mb-3">
            <h5 className="text-muted">Release Date</h5>
            <p>{new Date(movie.releaseDate).toLocaleDateString()}</p>
          </div>
          {movie.rating !== undefined && movie.rating !== null && (
            <div className="mb-3">
              <h5 className="text-muted">Rating</h5>
              <p>⭐ {movie.rating}/10</p>
            </div>
          )}
          <div className="mb-3">
            <h5 className="text-muted">Duration</h5>
            <p>{movie.duration} minutes</p>
          </div>
        </div>
      </div>
      
      <hr className="my-5" />
      
      {/* Reviews Section */}
      <div className="row">
        <div className="col-12">
          <h3 className="mb-4">Reviews ({reviews.length})</h3>
          
          {/* Add Review Form */}
          {currentUser ? (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Write a Review</h5>
                <form onSubmit={handleReviewSubmit}>
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Share your thoughts about this movie..."
                      value={newReview}
                      onChange={(e) => setNewReview(e.target.value)}
                      required
                      disabled={submittingReview}
                    ></textarea>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="alert alert-info mb-4">
              <strong>Want to write a review?</strong> Please{' '}
              <button 
                className="btn btn-link p-0 align-baseline"
                onClick={() => navigate('/login')}
              >
                log in
              </button>{' '}
              to share your thoughts.
            </div>
          )}
          
          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No reviews yet. Be the first to write one!</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                          style={{ width: '40px', height: '40px', fontSize: '16px', fontWeight: 'bold' }}
                        >
                          {review.user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <strong>{review.user?.username || 'Anonymous'}</strong>
                          <div className="text-muted small">
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete button for own reviews or admin */}
                      {currentUser && 
                       (currentUser.username === review.user?.username || 
                        currentUser.role === 'ADMIN') && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteReview(review.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="mb-0">{review.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;