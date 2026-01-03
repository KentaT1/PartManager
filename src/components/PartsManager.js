import React, { useState, useEffect } from 'react';
import './PartsManager.css';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const STATUS_OPTIONS = {
  'ready-to-manufacture': { label: 'Ready to Manufacture', color: '#10b981', bgColor: '#d1fae5' },
  'ready-to-review': { label: 'Ready to Review', color: '#f59e0b', bgColor: '#fef3c7' },
  'reviewed': { label: 'Reviewed', color: '#2563eb', bgColor: '#dbeafe' },
  'manufactured': { label: 'Manufactured', color: '#6b7280', bgColor: '#f3f4f6' }
};

function PartsManager() {
  const [subsystems, setSubsystems] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({
    name: '',
    onshape_link: '',
    status: 'ready-to-manufacture',
    drawn_by: '',
    reviewed_by: '',
    subsystem_id: null
  });

  // Fetch subsystems
  useEffect(() => {
    fetchSubsystems();
  }, []);

  // Fetch parts when active tab changes
  useEffect(() => {
    if (activeTab) {
      fetchParts(activeTab);
    }
  }, [activeTab]);

  const fetchSubsystems = async () => {
    try {
      const { data, error } = await supabase
        .from('subsystems')
        .select('*')
        .order('name');

      if (error) throw error;

      setSubsystems(data || []);
      if (data && data.length > 0 && !activeTab) {
        setActiveTab(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching subsystems:', error);
      // For demo purposes, create default subsystems if table doesn't exist
      const defaultSubsystems = [
        { id: 1, name: 'Drivetrain' },
        { id: 2, name: 'Intake' },
        { id: 3, name: 'Shooter' }
      ];
      setSubsystems(defaultSubsystems);
      setActiveTab(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async (subsystemId) => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('subsystem_id', subsystemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setParts([]);
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      alert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }
    
    if (!newPart.name.trim()) {
      alert('Please enter a part name');
      return;
    }

    if (!activeTab) {
      alert('Please select a subsystem first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('parts')
        .insert([
          {
            ...newPart,
            subsystem_id: activeTab
          }
        ])
        .select();

      if (error) {
        throw new Error(error.message || 'Database error. Make sure you have run the SQL schema in Supabase.');
      }

      // Refresh parts list
      fetchParts(activeTab);
      
      // Reset form
      setNewPart({
        name: '',
        onshape_link: '',
        status: 'ready-to-manufacture',
        drawn_by: '',
        reviewed_by: '',
        subsystem_id: null
      });
      setShowAddPart(false);
    } catch (error) {
      console.error('Error adding part:', error);
      let errorMessage = 'Error adding part: ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Cannot connect to Supabase. Check your internet connection and Supabase credentials.';
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        errorMessage += 'Database tables not found. Please run the SQL schema from database/schema.sql in your Supabase SQL Editor.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleUpdatePartStatus = async (partId, newStatus) => {
    try {
      const { error } = await supabase
        .from('parts')
        .update({ status: newStatus })
        .eq('id', partId);

      if (error) throw error;
      fetchParts(activeTab);
    } catch (error) {
      console.error('Error updating part status:', error);
      alert('Error updating part status: ' + error.message);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm('Are you sure you want to delete this part?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;
      fetchParts(activeTab);
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Error deleting part: ' + error.message);
    }
  };

  const addSubsystem = async () => {
    const name = prompt('Enter subsystem name:');
    if (!name) return;

    try {
      const { data, error } = await supabase
        .from('subsystems')
        .insert([{ name }])
        .select();

      if (error) throw error;
      fetchSubsystems();
    } catch (error) {
      console.error('Error adding subsystem:', error);
      alert('Error adding subsystem: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="parts-manager">
      {!isSupabaseConfigured && (
        <div className="config-warning">
          <strong>⚠️ Supabase Not Configured</strong>
          <p>Please set up your Supabase credentials to use this app. Create a <code>.env.local</code> file with your Supabase URL and anon key. See README.md for instructions.</p>
        </div>
      )}
      <div className="parts-manager-header">
        <h2>Parts Management</h2>
        <button onClick={addSubsystem} className="btn btn-secondary">
          + Add Subsystem
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {subsystems.map((subsystem) => (
          <button
            key={subsystem.id}
            className={`tab ${activeTab === subsystem.id ? 'active' : ''}`}
            onClick={() => setActiveTab(subsystem.id)}
          >
            {subsystem.name}
          </button>
        ))}
      </div>

      {/* Parts List */}
      {activeTab && (
        <div className="parts-content">
          <div className="parts-header">
            <h3>{subsystems.find(s => s.id === activeTab)?.name} Parts</h3>
            <button
              onClick={() => setShowAddPart(!showAddPart)}
              className="btn btn-primary"
            >
              {showAddPart ? 'Cancel' : '+ Add Part'}
            </button>
          </div>

          {/* Add Part Form */}
          {showAddPart && (
            <form onSubmit={handleAddPart} className="add-part-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Part Name *</label>
                  <input
                    type="text"
                    value={newPart.name}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>OnShape Link</label>
                  <input
                    type="url"
                    value={newPart.onshape_link}
                    onChange={(e) => setNewPart({ ...newPart, onshape_link: e.target.value })}
                    placeholder="https://cad.onshape.com/..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newPart.status}
                    onChange={(e) => setNewPart({ ...newPart, status: e.target.value })}
                  >
                    {Object.entries(STATUS_OPTIONS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Drawn By</label>
                  <input
                    type="text"
                    value={newPart.drawn_by}
                    onChange={(e) => setNewPart({ ...newPart, drawn_by: e.target.value })}
                    placeholder="Student name"
                  />
                </div>
                <div className="form-group">
                  <label>Reviewed By</label>
                  <input
                    type="text"
                    value={newPart.reviewed_by}
                    onChange={(e) => setNewPart({ ...newPart, reviewed_by: e.target.value })}
                    placeholder="Mentor name"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Add Part
              </button>
            </form>
          )}

          {/* Parts Table */}
          <div className="parts-table-container">
            {parts.length === 0 ? (
              <div className="empty-state">
                <p>No parts in this subsystem yet. Add one to get started!</p>
              </div>
            ) : (
              <table className="parts-table">
                <thead>
                  <tr>
                    <th>Part Name</th>
                    <th>OnShape Link</th>
                    <th>Status</th>
                    <th>Drawn By</th>
                    <th>Reviewed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part) => (
                    <tr key={part.id}>
                      <td>{part.name}</td>
                      <td>
                        {part.onshape_link ? (
                          <a
                            href={part.onshape_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link"
                          >
                            View Drawing
                          </a>
                        ) : (
                          <span className="no-link">No link</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={part.status}
                          onChange={(e) => handleUpdatePartStatus(part.id, e.target.value)}
                          className="status-select"
                          style={{
                            backgroundColor: STATUS_OPTIONS[part.status]?.bgColor || '#f3f4f6',
                            color: STATUS_OPTIONS[part.status]?.color || '#1a1a1a',
                            borderColor: STATUS_OPTIONS[part.status]?.color || '#d1d5db'
                          }}
                        >
                          {Object.entries(STATUS_OPTIONS).map(([value, { label }]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{part.drawn_by || '-'}</td>
                      <td>{part.reviewed_by || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PartsManager;

