import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import './PartsManager.css';

function Lifecycle() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [newSystem, setNewSystem] = useState({
    name: '',
    description: '',
    usage_time: 0
  });
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('systems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystems(data || []);
    } catch (error) {
      console.error('Error fetching systems:', error);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleAddSystem = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }

    if (!newSystem.name.trim()) {
      showAlert('Please enter a system name');
      return;
    }

    try {
      const { error } = await supabase
        .from('systems')
        .insert([{
          name: newSystem.name.trim(),
          description: newSystem.description.trim() || null,
          usage_time: parseFloat(newSystem.usage_time) || 0
        }]);

      if (error) {
        throw new Error(error.message || 'Database error. Make sure you have run the SQL schema in Supabase.');
      }

      setNewSystem({ name: '', description: '', usage_time: 0 });
      setShowAddSystem(false);
      fetchSystems();
    } catch (error) {
      console.error('Error adding system:', error);
      let errorMessage = 'Error adding system: ';

      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Cannot connect to Supabase. Check your internet connection and Supabase credentials.';
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        errorMessage += 'Database tables not found. Please run the SQL schema from database/schema.sql in your Supabase SQL Editor.';
      } else {
        errorMessage += error.message;
      }

      showAlert(errorMessage);
    }
  };

  const handleUpdateUsageTime = async (systemId, newUsageTime) => {
    try {
      const { error } = await supabase
        .from('systems')
        .update({ usage_time: parseFloat(newUsageTime) || 0 })
        .eq('id', systemId);

      if (error) throw error;
      fetchSystems();
    } catch (error) {
      console.error('Error updating usage time:', error);
      showAlert('Error updating usage time: ' + error.message);
    }
  };

  const handleDeleteSystem = async (systemId) => {
    if (!window.confirm('Are you sure you want to delete this system?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('systems')
        .delete()
        .eq('id', systemId);

      if (error) throw error;
      fetchSystems();
    } catch (error) {
      console.error('Error deleting system:', error);
      showAlert('Error deleting system: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Loading lifecycle data...</p>
      </div>
    );
  }

  return (
    <div className="lifecycle-container">
      <div className="lifecycle-header">
        <h2>System Lifecycle Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddSystem(true)}
        >
          + Add System
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="alert-warning" style={{ marginBottom: '2rem' }}>
          ⚠️ Supabase is not configured. Please set up your environment variables.
        </div>
      )}

      {systems.length === 0 ? (
        <div className="empty-state">
          <p>No systems found. Add a system to start tracking lifecycle data.</p>
        </div>
      ) : (
        <div className="systems-grid">
          {systems.map((system) => (
            <div key={system.id} className="system-card">
              <div className="system-card-header">
                <h3>{system.name}</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDeleteSystem(system.id)}
                  style={{ marginLeft: 'auto' }}
                >
                  Delete
                </button>
              </div>
              {system.description && (
                <p className="system-description">{system.description}</p>
              )}
              <div className="system-usage">
                <label>Usage Time (hours):</label>
                <input
                  type="number"
                  value={system.usage_time || 0}
                  onChange={(e) => handleUpdateUsageTime(system.id, e.target.value)}
                  step="0.1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div className="system-meta">
                <small>Created: {new Date(system.created_at).toLocaleDateString()}</small>
                {system.updated_at && (
                  <small>Updated: {new Date(system.updated_at).toLocaleDateString()}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add System Modal */}
      {showAddSystem && (
        <div className="modal-overlay" onClick={() => setShowAddSystem(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add System</h3>
              <button className="modal-close" onClick={() => setShowAddSystem(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleAddSystem} className="modal-form">
              <div className="form-group">
                <label>System Name *</label>
                <input
                  type="text"
                  value={newSystem.name}
                  onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newSystem.description}
                  onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Initial Usage Time (hours)</label>
                <input
                  type="number"
                  value={newSystem.usage_time}
                  onChange={(e) => setNewSystem({ ...newSystem, usage_time: e.target.value })}
                  step="0.1"
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddSystem(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Alert</h3>
              <button className="modal-close" onClick={() => setShowAlertModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p style={{ whiteSpace: 'pre-line' }}>{alertMessage}</p>
              <div className="modal-actions">
                <button onClick={() => setShowAlertModal(false)} className="btn btn-primary">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lifecycle;

