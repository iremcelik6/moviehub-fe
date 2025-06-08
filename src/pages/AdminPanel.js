import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { moviesAPI, seriesAPI } from '../services/api';

const AdminPanel = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    
    loadContent();
  }, [currentUser, isAuthenticated, navigate, activeTab]);

  const loadContent = async () => {
    try {
      setLoading(true);
      if (activeTab === 'movies') {
        const response = await moviesAPI.getAll();
        setMovies(response.data);
      } else {
        const response = await seriesAPI.getAll();
        setSeries(response.data);
      }
    } catch (error) {
      console.error('Content could not be loaded:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (activeTab === 'movies') {
      setFormData({
        title: '',
        description: '',
        releaseDate: '',
        genre: '',
        director: '',
        duration: '',
        posterUrl: ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        releaseDate: '',
        genre: '',
        seasons: '',
        episodes: '',
        status: 'Ongoing',
        posterUrl: ''
      });
    }
  };

  const handleAdd = () => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setFormData({
      ...item,
      releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : ''
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      if (activeTab === 'movies') {
        await moviesAPI.delete(id);
      } else {
        await seriesAPI.delete(id);
      }
      setMessage('Content successfully deleted!');
      loadContent();
    } catch (error) {
      setMessage('Delete operation failed!');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : null,
        seasons: formData.seasons ? parseInt(formData.seasons) : null,
        episodes: formData.episodes ? parseInt(formData.episodes) : null
      };

      if (editingId) {
        // Update
        if (activeTab === 'movies') {
          await moviesAPI.update(editingId, submitData);
        } else {
          await seriesAPI.update(editingId, submitData);
        }
        setMessage('Content successfully updated!');
      } else {
        // New addition
        if (activeTab === 'movies') {
          await moviesAPI.create(submitData);
        } else {
          await seriesAPI.create(submitData);
        }
        setMessage('Content successfully added!');
      }
      
      setShowForm(false);
      loadContent();
    } catch (error) {
      setMessage('Operation failed!');
      console.error('Form error:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null;
  }

  const currentContent = activeTab === 'movies' ? movies : series;

  return (
    <div className="container mt-4">
      <div className="admin-panel">
        <h2 className="mb-4">Admin Panel</h2>
        
        {message && (
          <div className={`alert ${message.includes('failed') ? 'alert-danger' : 'alert-success'}`}>
            {message}
            <button
              type="button"
              className="btn-close float-end"
              onClick={() => setMessage('')}
            ></button>
          </div>
        )}

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'movies' ? 'active' : ''}`}
              onClick={() => setActiveTab('movies')}
            >
              🎬 Movies
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'series' ? 'active' : ''}`}
              onClick={() => setActiveTab('series')}
            >
              📺 Series
            </button>
          </li>
        </ul>

        {/* Add Button */}
        <div className="mb-3">
          <button
            className="btn btn-success"
            onClick={handleAdd}
          >
            ➕ Add New {activeTab === 'movies' ? 'Movie' : 'Series'}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="card mb-4">
            <div className="card-header">
              <h5>
                {editingId ? 'Edit' : 'Add New'} - {activeTab === 'movies' ? 'Movie' : 'Series'}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Genre</label>
                      <input
                        type="text"
                        className="form-control"
                        name="genre"
                        value={formData.genre || ''}
                        onChange={handleChange}
                        placeholder="Action, Drama, Comedy..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={formData.description || ''}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Release Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="releaseDate"
                        value={formData.releaseDate || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Poster URL</label>
                      <input
                        type="url"
                        className="form-control"
                        name="posterUrl"
                        value={formData.posterUrl || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/poster.jpg"
                      />
                    </div>
                  </div>
                </div>

                {activeTab === 'movies' ? (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Director</label>
                        <input
                          type="text"
                          className="form-control"
                          name="director"
                          value={formData.director || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Duration (minutes)</label>
                        <input
                          type="number"
                          className="form-control"
                          name="duration"
                          value={formData.duration || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Number of Seasons</label>
                        <input
                          type="number"
                          className="form-control"
                          name="seasons"
                          value={formData.seasons || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Total Episodes</label>
                        <input
                          type="number"
                          className="form-control"
                          name="episodes"
                          value={formData.episodes || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-control"
                          name="status"
                          value={formData.status || 'Ongoing'}
                          onChange={handleChange}
                        >
                          <option value="Ongoing">Ongoing</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Yükleniyor...</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Poster</th>
                  <th>Title</th>
                  <th>Genre</th>
                  <th>Release Date</th>
                  {activeTab === 'movies' ? <th>Duration</th> : <th>Seasons/Episodes</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentContent.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img
                        src={item.posterUrl || 'https://via.placeholder.com/50x75?text=No+Image'}
                        alt={item.title}
                        style={{ width: '50px', height: '75px', objectFit: 'cover' }}
                        className="rounded"
                      />
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      <small className="text-muted">
                        {item.description?.substring(0, 50)}...
                      </small>
                    </td>
                    <td>{item.genre}</td>
                    <td>
                      {item.releaseDate
                        ? new Date(item.releaseDate).toLocaleDateString('tr-TR')
                        : '-'}
                    </td>
                    <td>
                      {activeTab === 'movies'
                        ? `${item.duration || '-'} min`
                        : `${item.seasons || '-'} seasons / ${item.episodes || '-'} episodes`}
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {currentContent.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted">
                  Henüz {activeTab === 'movies' ? 'movie' : 'series'} eklenmemiş.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;