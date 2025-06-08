import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { seriesAPI, reviewsAPI, ratingsAPI, favoritesAPI } from '../services/api';
import StarRating from '../components/StarRating';

const SeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [series, setSeries] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 });
  const [userRating, setUserRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadSeriesDetails();
  }, [id]);

  const loadSeriesDetails = async () => {
    try {
      setLoading(true);
      
      // Dizi bilgilerini getir
      const seriesResponse = await seriesAPI.getById(id);
      setSeries(seriesResponse.data);
      
      // Yorumları getir
      const reviewsResponse = await reviewsAPI.getByContent(id, 'SERIES');
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
      const ratingResponse = await ratingsAPI.getContentRating(id, 'SERIES');
      setRating(ratingResponse.data);
      
      if (currentUser) {
        // Kullanıcının puanını getir
        try {
          const userRatingResponse = await ratingsAPI.getUserRating(id, 'SERIES');
          setUserRating(userRatingResponse.data.score);
        } catch (error) {
          // Kullanıcı henüz puan vermemiş
          setUserRating(0);
        }
        
        // Favori durumunu kontrol et
        const favoriteResponse = await favoritesAPI.check(id, 'SERIES');
        setIsFavorite(favoriteResponse.data.isFavorite);
      }
    } catch (error) {
      console.error('Series details could not be loaded:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (score) => {
    if (!currentUser) {
      alert('Puan vermek için giriş yapmalısınız!');
      return;
    }

    try {
      await ratingsAPI.createOrUpdate({
        contentId: parseInt(id),
        contentType: 'SERIES',
        score: score
      });
      setUserRating(score);
      
      // Ortalama puanı güncelle
      const ratingResponse = await ratingsAPI.getContentRating(id, 'SERIES');
      setRating(ratingResponse.data);
    } catch (error) {
      console.error('Puan verilemedi:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      alert('You must be logged in to add favorites!');
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!isFavorite); // Optimistic update

    try {
      if (previousState) {
        await favoritesAPI.remove(id, 'SERIES');
        console.log('💔 Removed from favorites');
      } else {
        await favoritesAPI.add(id, 'SERIES');
        console.log('❤️ Added to favorites');
      }
    } catch (error) {
      console.error('❌ Favorite toggle error:', error);
      //setIsFavorite(previousState); // Revert on error
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        //alert('Your session has expired. Please login again.');
      } else {
        alert('Failed to update favorites. Please try again.');
      }
    }
  };

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
        contentType: 'SERIES',
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

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">Series not found!</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <button 
        className="btn btn-outline-primary mb-4"
        onClick={() => navigate(-1)}
      >
        ← Back to Series
      </button>
      
      <div className="row">
        <div className="col-md-4">
          <img
            src={series.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
            alt={series.title}
            className="img-fluid rounded"
          />
        </div>
        
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h1>{series.title}</h1>
            {currentUser && (
              <button
                className={`btn ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={toggleFavorite}
              >
                {isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
              </button>
            )}
          </div>
          
          <div className="mb-3">
            <span className="badge bg-primary me-2">{series.genre}</span>
            <span className="badge bg-secondary me-2">{series.status}</span>
            <span className="text-muted">({new Date(series.releaseDate).getFullYear()})</span>
            {series.rating && (
              <span className="ms-2 text-muted">
                ⭐ Rating: {series.rating}/10
              </span>
            )}
            {series.averageRating && (
              <span className="ms-2 text-muted">
                ⭐ Average: {series.averageRating.toFixed(1)}/10
                {series.ratingCount && ` (${series.ratingCount})`}
              </span>
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
              {series.description || 'No description available for this series.'}
            </p>
          </div>

          <div className="mb-3">
            <h5 className="text-muted">Release Date</h5>
            <p>{new Date(series.releaseDate).toLocaleDateString()}</p>
          </div>
          <div className="mb-3">
            <h5 className="text-muted">Seasons & Episodes</h5>
            <p>{series.seasons} Seasons • {series.episodes} Episodes</p>
          </div>
        </div>
      </div>
      
      <hr className="my-5" />
      
      {/* Reviews Section */}
      <div className="row">
        <div className="col-12">
          <h3>Reviews ({reviews.length})</h3>
          
          {currentUser && (
            <form onSubmit={handleReviewSubmit} className="mb-4">
              <div className="mb-3">
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Write your review..."
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary">
                Add Review
              </button>
            </form>
          )}
          
          {reviews.length === 0 ? (
            <p className="text-muted">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="d-flex align-items-center mb-2">
                  <div className="user-avatar">
                    {review.user?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <strong>{review.user?.username || 'Anonymous User'}</strong>
                    <div className="text-muted small">
                      {new Date(review.createdAt).toLocaleDateString('en-US')}
                    </div>
                  </div>
                  {currentUser && (currentUser.username === review.user?.username || currentUser.role === 'ADMIN') && (
                    <button
                      className="btn btn-sm btn-outline-danger ms-auto"
                      onClick={() => deleteReview(review.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p>{review.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;