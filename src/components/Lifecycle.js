import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import './PartsManager.css';

function Lifecycle() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'system-management'
  const [systems, setSystems] = useState([]);
  const [subsystems, setSubsystems] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [newSystem, setNewSystem] = useState({
    name: '',
    description: '',
    usage_time: 0
  });
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  
  // Dashboard state
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [maintenanceItemsKey, setMaintenanceItemsKey] = useState(0); // Force re-render key
  const [predictedWarnings, setPredictedWarnings] = useState([]);
  const [selectedSystemForFailure, setSelectedSystemForFailure] = useState('');
  const [failureComponents, setFailureComponents] = useState('');
  const [failureComment, setFailureComment] = useState('');
  const [selectedPartsForFailure, setSelectedPartsForFailure] = useState([]);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const [wpilogFile, setWpilogFile] = useState(null);
  const [wpilogTime, setWpilogTime] = useState('');
  const [uploadingWpilog, setUploadingWpilog] = useState(false);

  // System Management state
  // eslint-disable-next-line no-unused-vars
  const [editingSystem, setEditingSystem] = useState(null);
  const [systemParts, setSystemParts] = useState({}); // systemId -> array of part IDs
  const [systemSubsystems, setSystemSubsystems] = useState({}); // systemId -> array of subsystem IDs
  const [showLinkPartsModal, setShowLinkPartsModal] = useState(false);
  const [linkingSystem, setLinkingSystem] = useState(null);
  const [selectedPartsToLink, setSelectedPartsToLink] = useState([]);
  const [selectedSubsystemsToLink, setSelectedSubsystemsToLink] = useState([]);
  
  // System Details Modal state
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [selectedSystemDetails, setSelectedSystemDetails] = useState(null);
  const [systemFailures, setSystemFailures] = useState([]);
  const [systemCompletedMaintenance, setSystemCompletedMaintenance] = useState([]);
  const [systemUpcomingMaintenance, setSystemUpcomingMaintenance] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [newMaintenance, setNewMaintenance] = useState({
    title: '',
    description: '',
    repeat_interval_matches: '',
    type: 'maintenance'
  });
  
  // Maintenance Details Modal state
  const [showMaintenanceDetails, setShowMaintenanceDetails] = useState(false);
  const [selectedMaintenanceItem, setSelectedMaintenanceItem] = useState(null);
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPrematureConfirm, setShowPrematureConfirm] = useState(false);
  const [maintenanceToComplete, setMaintenanceToComplete] = useState(null);
  
  // Edit Maintenance Modal state
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [editMaintenanceForm, setEditMaintenanceForm] = useState({
    title: '',
    description: ''
  });
  

  useEffect(() => {
    fetchSystems();
    fetchSubsystems();
    fetchParts();
    if (activeTab === 'dashboard') {
      fetchMaintenanceItems();
      fetchPredictedWarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPartsDropdown && !event.target.closest('.searchable-dropdown-container')) {
        setShowPartsDropdown(false);
      }
    };

    if (showPartsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPartsDropdown]);

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
      
      // Fetch linked parts and subsystems for each system
      if (data && data.length > 0) {
        for (const system of data) {
          fetchSystemLinks(system.id);
        }
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubsystems = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('subsystems')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubsystems(data || []);
    } catch (error) {
      console.error('Error fetching subsystems:', error);
      setSubsystems([]);
    }
  };

  const fetchParts = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('name');

      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setParts([]);
    }
  };

  const fetchSystemLinks = async (systemId) => {
    if (!isSupabaseConfigured) return;

    try {
      // Fetch linked parts
      const { data: partsData, error: partsError } = await supabase
        .from('system_parts')
        .select('part_id')
        .eq('system_id', systemId);

      if (partsError) throw partsError;
      
      // Fetch linked subsystems
      const { data: subsystemsData, error: subsystemsError } = await supabase
        .from('system_subsystems')
        .select('subsystem_id')
        .eq('system_id', systemId);

      if (subsystemsError) throw subsystemsError;

      setSystemParts(prev => ({
        ...prev,
        [systemId]: partsData?.map(p => p.part_id) || []
      }));

      setSystemSubsystems(prev => ({
        ...prev,
        [systemId]: subsystemsData?.map(s => s.subsystem_id) || []
      }));
    } catch (error) {
      console.error('Error fetching system links:', error);
    }
  };

  const fetchMaintenanceItems = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('maintenance_reviews')
        .select(`
          *,
          systems!maintenance_reviews_system_id_fkey (
            id,
            name,
            usage_time
          )
        `)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50);

      if (error) throw error;
      // Force new array reference to ensure React detects the change
      const items = data ? [...data] : [];
      setMaintenanceItems(items);
    } catch (error) {
      console.error('Error fetching maintenance items:', error);
      // If join fails, try without join
      try {
        const { data, error: simpleError } = await supabase
          .from('maintenance_reviews')
          .select('*')
          .eq('completed', false)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(50);
        
        if (simpleError) throw simpleError;
        
        // Manually join with systems
        const itemsWithSystems = await Promise.all(
          (data || []).map(async (item) => {
            const { data: systemData } = await supabase
              .from('systems')
              .select('id, name, usage_time')
              .eq('id', item.system_id)
              .single();
            return { ...item, systems: systemData };
          })
        );
        setMaintenanceItems([...itemsWithSystems]);
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError);
        setMaintenanceItems([]);
      }
    }
  };

  // Fetch predicted warnings based on MTBF
  const fetchPredictedWarnings = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('predicted_warnings')
        .select(`
          *,
          systems!predicted_warnings_system_id_fkey (
            id,
            name,
            usage_time
          )
        `)
        .eq('dismissed', false)
        .order('predicted_failure_runtime_minutes', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Force new array reference
      const warnings = data ? [...data] : [];
      setPredictedWarnings(warnings);
    } catch (error) {
      console.error('Error fetching predicted warnings:', error);
      // If join fails, try without join
      try {
        const { data, error: simpleError } = await supabase
          .from('predicted_warnings')
          .select('*')
          .eq('dismissed', false)
          .order('predicted_failure_runtime_minutes', { ascending: true })
          .limit(50);
        
        if (simpleError) throw simpleError;
        
        // Manually join with systems
        const warningsWithSystems = await Promise.all(
          (data || []).map(async (warning) => {
            const { data: systemData } = await supabase
              .from('systems')
              .select('id, name, usage_time')
              .eq('id', warning.system_id)
              .single();
            return { ...warning, systems: systemData };
          })
        );
        setPredictedWarnings([...warningsWithSystems]);
      } catch (fallbackError) {
        console.error('Error in fallback fetch predicted warnings:', fallbackError);
        setPredictedWarnings([]);
      }
    }
  };

  // Calculate MTBF for a system and generate predicted warning
  const calculateMTBFAndGenerateWarning = async (systemId) => {
    if (!isSupabaseConfigured) return;

    try {
      // Get system data
      const { data: systemData, error: systemError } = await supabase
        .from('systems')
        .select('usage_time')
        .eq('id', systemId)
        .single();

      if (systemError) throw systemError;
      if (!systemData) return;

      // Get all failures for this system
      const { data: failuresData, error: failuresError } = await supabase
        .from('failures')
        .select('components_needing_replacement, comment, created_at')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false });

      if (failuresError) throw failuresError;

      const totalFailures = failuresData?.length || 0;
      const usageTimeMinutes = systemData.usage_time || 0;

      // Calculate MTBF: Total Operating Time / Number of Failures
      // Need at least 2 failures to calculate meaningful MTBF
      if (totalFailures < 2) {
        // Not enough data, don't generate warning yet
        return;
      }

      const mtbfMinutes = usageTimeMinutes / totalFailures;

      // Update system with calculated MTBF
      const { error: updateError } = await supabase
        .from('systems')
        .update({
          mtbf_minutes: mtbfMinutes,
          total_failures: totalFailures,
          last_failure_at: failuresData[0]?.created_at || null
        })
        .eq('id', systemId);

      if (updateError) throw updateError;

      // Generate predicted warning (predict at 80% of MTBF for proactive maintenance)
      const predictedFailureRuntimeMinutes = usageTimeMinutes + (mtbfMinutes * 0.8);

      // Analyze failure history to identify common failure components
      const componentFrequency = {};
      failuresData.forEach(failure => {
        if (failure.components_needing_replacement && Array.isArray(failure.components_needing_replacement)) {
          failure.components_needing_replacement.forEach(component => {
            componentFrequency[component] = (componentFrequency[component] || 0) + 1;
          });
        }
      });

      // Get most common failure components (top 3)
      const likelyFailures = Object.entries(componentFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([component]) => component);

      // Generate review notes
      const reviewNotes = `Based on MTBF analysis (${(mtbfMinutes / 60).toFixed(1)} hours), this system is predicted to need review at ${(predictedFailureRuntimeMinutes / 60).toFixed(1)} hours of runtime. ` +
        (likelyFailures.length > 0
          ? `Common failure components to review: ${likelyFailures.join(', ')}. `
          : '') +
        `Review system for signs of wear, check all moving parts, and verify proper operation.`;

      // Check if a warning already exists for this system
      const { data: existingWarnings } = await supabase
        .from('predicted_warnings')
        .select('id')
        .eq('system_id', systemId)
        .eq('dismissed', false)
        .limit(1);

      if (existingWarnings && existingWarnings.length > 0) {
        // Update existing warning
        const { error: updateWarningError } = await supabase
          .from('predicted_warnings')
          .update({
            predicted_failure_runtime_minutes: predictedFailureRuntimeMinutes,
            review_notes: reviewNotes,
            likely_failures: likelyFailures,
            mtbf_minutes: mtbfMinutes
          })
          .eq('id', existingWarnings[0].id);

        if (updateWarningError) throw updateWarningError;
      } else {
        // Create new warning
        const { error: insertError } = await supabase
          .from('predicted_warnings')
          .insert([{
            system_id: systemId,
            predicted_failure_runtime_minutes: predictedFailureRuntimeMinutes,
            review_notes: reviewNotes,
            likely_failures: likelyFailures,
            mtbf_minutes: mtbfMinutes
          }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error calculating MTBF and generating warning:', error);
      // Don't throw - this is not critical for failure reporting
    }
  };

  // Recalculate predicted warnings for all systems that have predicted warnings
  // This should be called when usage_time changes
  const recalculatePredictedWarningsForAllSystems = async () => {
    if (!isSupabaseConfigured) return;

    try {
      // Get all systems that have predicted warnings
      const { data: warningsData, error: warningsError } = await supabase
        .from('predicted_warnings')
        .select('system_id')
        .eq('dismissed', false);

      if (warningsError) throw warningsError;
      if (!warningsData || warningsData.length === 0) return;

      // Get unique system IDs
      const systemIds = [...new Set(warningsData.map(w => w.system_id))];

      // Recalculate MTBF and update predicted warnings for each system
      await Promise.all(systemIds.map(systemId => calculateMTBFAndGenerateWarning(systemId)));

      // Refresh predicted warnings list
      await fetchPredictedWarnings();
    } catch (error) {
      console.error('Error recalculating predicted warnings:', error);
      // Don't throw - this is not critical
    }
  };

  // Dismiss a predicted warning
  const handleDismissPredictedWarning = async (warningId) => {
    try {
      const { error } = await supabase
        .from('predicted_warnings')
        .update({ 
          dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', warningId);

      if (error) throw error;
      fetchPredictedWarnings();
    } catch (error) {
      console.error('Error dismissing predicted warning:', error);
      showAlert('Error dismissing warning: ' + error.message);
    }
  };

  // Get filtered predicted warnings (only show warnings that are approaching)
  const getFilteredPredictedWarnings = () => {
    if (!predictedWarnings || predictedWarnings.length === 0) return [];
    
    return predictedWarnings
      .filter(warning => {
        const system = warning.systems || systems.find(s => s.id === warning.system_id);
        if (!system) return false;
        
        const currentRuntimeMinutes = system.usage_time || 0;
        const predictedRuntimeMinutes = warning.predicted_failure_runtime_minutes || 0;
        
        // Only show warnings where predicted runtime is >= current runtime (upcoming or due)
        return predictedRuntimeMinutes >= currentRuntimeMinutes;
      })
      .map(warning => {
        const system = warning.systems || systems.find(s => s.id === warning.system_id);
        const currentRuntimeMinutes = system?.usage_time || 0;
        const predictedRuntimeMinutes = warning.predicted_failure_runtime_minutes || 0;
        const minutesUntilPredicted = predictedRuntimeMinutes - currentRuntimeMinutes;
        const matchesUntilPredicted = minutesUntilPredicted / 2.5;
        const isDue = minutesUntilPredicted <= 0;
        
        return {
          ...warning,
          minutesUntilPredicted,
          matchesUntilPredicted,
          isDue
        };
      })
      .sort((a, b) => a.predicted_failure_runtime_minutes - b.predicted_failure_runtime_minutes);
  };

  // Calculate filtered maintenance items based on matches ahead
  // Calculate maintenance items - show one instance per maintenance schedule
  const getFilteredMaintenanceItems = () => {
    if (!maintenanceItems || maintenanceItems.length === 0) return [];
    
    const result = [];
    
    // Filter out any items that are marked as completed (safety check)
    const activeItems = maintenanceItems.filter(item => !item.completed);
    
    activeItems.forEach((item) => {
      const system = item.systems || systems.find(s => s.id === item.system_id);
      if (!system) return;
      
      const currentRuntimeMinutes = system.usage_time || 0;
      
      // Get next due runtime from database column, or calculate from description (backward compatibility)
      // Note: next_due_runtime_hours is still in hours in the database, so we convert it to minutes
      let nextDueRuntimeHours = item.next_due_runtime_hours;
      let repeatIntervalMatches = item.repeat_interval_matches;
      
      // Backward compatibility: extract from description if columns are null
      if (!nextDueRuntimeHours || !repeatIntervalMatches) {
        const desc = item.description || '';
        const runtimeMatch = desc.match(/target runtime: ([\d.]+) hours/);
        if (runtimeMatch) {
          nextDueRuntimeHours = parseFloat(runtimeMatch[1]);
        }
        const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
        if (repeatMatch) {
          repeatIntervalMatches = parseFloat(repeatMatch[1]);
        }
      }
      
      // Skip if we don't have the required data
      if (!nextDueRuntimeHours || !repeatIntervalMatches) return;
      
      const nextDueRuntimeMinutes = nextDueRuntimeHours * 60;
      const matchesRemaining = (nextDueRuntimeMinutes - currentRuntimeMinutes) / 2.5;
      const isDue = nextDueRuntimeMinutes <= currentRuntimeMinutes;
      
      // Show one instance per maintenance schedule
      result.push({
        ...item,
        nextDueRuntimeHours,
        repeatIntervalMatches,
        matchesRemaining,
        isDue
      });
    });
    
    // Sort by next due runtime (overdue first, then upcoming)
    return result.sort((a, b) => a.nextDueRuntimeHours - b.nextDueRuntimeHours);
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
      // Store usage time in minutes
      const usageTimeMinutes = parseFloat(newSystem.usage_time) || 0;
      
      const { error } = await supabase
        .from('systems')
        .insert([{
          name: newSystem.name.trim(),
          description: newSystem.description.trim() || null,
          usage_time: usageTimeMinutes,
          in_usage: true
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

  const handleDragStart = (e, systemId) => {
    e.dataTransfer.setData('systemId', systemId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, targetCategory) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const systemId = parseInt(e.dataTransfer.getData('systemId'));
    
    if (!systemId) return;

    const system = systems.find(s => s.id === systemId);
    if (!system) return;

    const newInUsage = targetCategory === 'in-usage';
    
    // Only update if the category actually changed
    if (system.in_usage === newInUsage) return;

    await updateSystemUsageStatus(systemId, newInUsage);
  };

  const handleToggleUsageStatus = async (systemId, currentStatus) => {
    const newInUsage = !currentStatus;
    await updateSystemUsageStatus(systemId, newInUsage);
  };

  const updateSystemUsageStatus = async (systemId, newInUsage) => {
    try {
      const { error } = await supabase
        .from('systems')
        .update({ in_usage: newInUsage })
        .eq('id', systemId);

      if (error) throw error;
      fetchSystems();
    } catch (error) {
      console.error('Error updating system category:', error);
      showAlert('Error updating system category: ' + error.message);
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

  const openLinkPartsModal = (system) => {
    setLinkingSystem(system);
    setSelectedPartsToLink(systemParts[system.id] || []);
    setSelectedSubsystemsToLink(systemSubsystems[system.id] || []);
    setShowLinkPartsModal(true);
  };

  const handleLinkParts = async () => {
    if (!linkingSystem) return;

    try {
      // Delete existing links
      await supabase
        .from('system_parts')
        .delete()
        .eq('system_id', linkingSystem.id);

      await supabase
        .from('system_subsystems')
        .delete()
        .eq('system_id', linkingSystem.id);

      // Insert new part links
      if (selectedPartsToLink.length > 0) {
        const partLinks = selectedPartsToLink.map(partId => ({
          system_id: linkingSystem.id,
          part_id: partId
        }));
        const { error: partsError } = await supabase
          .from('system_parts')
          .insert(partLinks);
        if (partsError) throw partsError;
      }

      // Insert new subsystem links
      if (selectedSubsystemsToLink.length > 0) {
        const subsystemLinks = selectedSubsystemsToLink.map(subsystemId => ({
          system_id: linkingSystem.id,
          subsystem_id: subsystemId
        }));
        const { error: subsystemsError } = await supabase
          .from('system_subsystems')
          .insert(subsystemLinks);
        if (subsystemsError) throw subsystemsError;
      }

      fetchSystemLinks(linkingSystem.id);
      setShowLinkPartsModal(false);
      setLinkingSystem(null);
    } catch (error) {
      console.error('Error linking parts:', error);
      showAlert('Error linking parts: ' + error.message);
    }
  };

  const handleWpilogUpload = async () => {
    // Check if either file or manual time is provided
    if (!wpilogFile && !wpilogTime) {
      showAlert('Please either select a wpilog file or enter time in minutes');
      return;
    }

    if (!isSupabaseConfigured) {
      showAlert('Supabase is not configured');
      return;
    }

    setUploadingWpilog(true);

    try {
      let timeValue; // Time in minutes
      
      if (wpilogFile) {
        // Read the file as ArrayBuffer
        const arrayBuffer = await wpilogFile.arrayBuffer();
        
        // Parse the log file to get elapsed time in minutes
        const { parseWpilogFileRobust } = await import('../utils/logParser');
        const elapsedMinutes = await parseWpilogFileRobust(arrayBuffer);
        timeValue = elapsedMinutes; // Already in minutes
      } else {
        // Manual time entry
        const timeValueMinutes = parseFloat(wpilogTime);
        if (isNaN(timeValueMinutes) || timeValueMinutes <= 0) {
          showAlert('Please enter a valid time value in minutes');
          setUploadingWpilog(false);
          return;
        }
        timeValue = timeValueMinutes; // Already in minutes
      }

      // Fetch all systems
      const { data: allSystems, error: fetchError } = await supabase
        .from('systems')
        .select('id, usage_time');

      if (fetchError) throw fetchError;

      if (!allSystems || allSystems.length === 0) {
        showAlert('No systems found. Create systems first.');
        return;
      }

      // Update all systems' usage_time by adding elapsed time (in minutes) to each
      const updatePromises = allSystems.map(system => {
        const currentUsageTime = system.usage_time || 0;
        const newUsageTime = currentUsageTime + timeValue;
        
        return supabase
          .from('systems')
          .update({ usage_time: newUsageTime })
          .eq('id', system.id);
      });

      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} system(s)`);
      }

      // Prepare success message before resetting form
      const wasFileUpload = !!wpilogFile;
      const timeDisplay = wasFileUpload 
        ? `${timeValue.toFixed(1)} minutes (from file)`
        : `${timeValue.toFixed(1)} minutes`;

      // Reset form
      setWpilogFile(null);
      setWpilogTime('');
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      fetchSystems();
      fetchMaintenanceItems(); // Refresh the upcoming maintenance section
      
      // Recalculate predicted warnings for all systems since usage_time has changed
      await recalculatePredictedWarningsForAllSystems();
      
      if (selectedSystemDetails) {
        await fetchSystemFailures(selectedSystemDetails.id); // Refresh selected system's upcoming maintenance
      }
      showAlert(`Success! Added ${timeDisplay} to all ${allSystems.length} system(s).`);
    } catch (error) {
      console.error('Error uploading wpilog:', error);
      showAlert('Error uploading wpilog: ' + error.message);
    } finally {
      setUploadingWpilog(false);
    }
  };

  const handleReportFailure = async () => {
    if (!selectedSystemForFailure || !failureComment.trim()) {
      showAlert('Please select a system and enter a comment');
      return;
    }

    try {
      const components = failureComponents.trim()
        ? failureComponents.split(',').map(c => c.trim()).filter(c => c)
        : [];

      // Add selected parts to components if any
      const selectedPartNames = selectedPartsForFailure
        .map(partId => parts.find(p => p.id === partId)?.name)
        .filter(Boolean);
      
      const allComponents = [...components, ...selectedPartNames];

      const { error } = await supabase
        .from('failures')
        .insert([{
          system_id: selectedSystemForFailure,
          components_needing_replacement: allComponents,
          comment: failureComment.trim()
        }]);

      if (error) throw error;

      // Reset time_since_last_maintenance to 0 for the system
      const { error: updateError } = await supabase
        .from('systems')
        .update({ time_since_last_maintenance: 0.0 })
        .eq('id', selectedSystemForFailure);

      if (updateError) throw updateError;

      // Calculate MTBF and generate predicted warning
      await calculateMTBFAndGenerateWarning(parseInt(selectedSystemForFailure));

      setSelectedSystemForFailure('');
      setFailureComponents('');
      setFailureComment('');
      setSelectedPartsForFailure([]);
      setPartsSearchTerm('');
      setShowPartsDropdown(false);
      fetchSystems(); // Refresh systems to show updated time_since_last_maintenance
      fetchPredictedWarnings(); // Refresh predicted warnings
      
      // Refresh timeline if System Details modal is open for this system
      if (selectedSystemDetails && selectedSystemDetails.id === parseInt(selectedSystemForFailure)) {
        await fetchSystemFailures(parseInt(selectedSystemForFailure));
      }
      
      showAlert('Failure reported successfully');
    } catch (error) {
      console.error('Error reporting failure:', error);
      showAlert('Error reporting failure: ' + error.message);
    }
  };

  // Get linked parts for a system (includes directly linked parts and parts from linked subsystems)
  const getLinkedPartsForSystem = (systemId) => {
    if (!systemId) return [];
    
    // Get directly linked parts
    const linkedPartIds = systemParts[systemId] || [];
    const directlyLinkedParts = parts.filter(part => linkedPartIds.includes(part.id));
    
    // Get linked subsystems
    const linkedSubsystemIds = systemSubsystems[systemId] || [];
    
    // Get all parts that belong to linked subsystems
    const partsFromSubsystems = parts.filter(part => 
      linkedSubsystemIds.includes(part.subsystem_id)
    );
    
    // Combine both lists and remove duplicates by part id
    const allParts = [...directlyLinkedParts, ...partsFromSubsystems];
    const uniqueParts = allParts.filter((part, index, self) => 
      index === self.findIndex(p => p.id === part.id)
    );
    
    return uniqueParts;
  };

  // Get filtered parts based on search term
  const getFilteredParts = (systemId) => {
    const linkedParts = getLinkedPartsForSystem(systemId);
    if (!partsSearchTerm.trim()) return linkedParts;
    
    const searchLower = partsSearchTerm.toLowerCase();
    return linkedParts.filter(part => 
      part.name.toLowerCase().includes(searchLower)
    );
  };

  // Toggle part selection
  const togglePartSelection = (partId) => {
    setSelectedPartsForFailure(prev => {
      if (prev.includes(partId)) {
        return prev.filter(id => id !== partId);
      } else {
        return [...prev, partId];
      }
    });
  };

  // Remove selected part
  const removeSelectedPart = (partId) => {
    setSelectedPartsForFailure(prev => prev.filter(id => id !== partId));
  };

  // Open system details modal
  const openSystemDetails = async (system) => {
    setSelectedSystemDetails(system);
    setShowSystemDetails(true);
    setExpandedReportId(null);
    await fetchSystemFailures(system.id);
  };

  // Fetch failures, completed maintenance, and upcoming maintenance for a system
  const fetchSystemFailures = async (systemId) => {
    if (!isSupabaseConfigured) return;

    try {
      // Fetch failures (sorted by created_at ascending - oldest first for timeline)
      const { data: failuresData, error: failuresError } = await supabase
        .from('failures')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: true });

      if (failuresError) throw failuresError;

      // Fetch completed maintenance items (sorted by completed_at ascending - oldest first for timeline)
      const { data: completedMaintenanceData, error: completedMaintenanceError } = await supabase
        .from('maintenance_reviews')
        .select('*')
        .eq('system_id', systemId)
        .eq('completed', true)
        .order('completed_at', { ascending: true });

      if (completedMaintenanceError) throw completedMaintenanceError;

      // Fetch upcoming maintenance items (not completed)
      const { data: upcomingMaintenanceData, error: upcomingMaintenanceError } = await supabase
        .from('maintenance_reviews')
        .select('*')
        .eq('system_id', systemId)
        .eq('completed', false)
        .order('created_at', { ascending: true });

      if (upcomingMaintenanceError) throw upcomingMaintenanceError;

      setSystemFailures(failuresData || []);
      setSystemCompletedMaintenance(completedMaintenanceData || []);
      setSystemUpcomingMaintenance(upcomingMaintenanceData || []);
    } catch (error) {
      console.error('Error fetching system events:', error);
      setSystemFailures([]);
      setSystemCompletedMaintenance([]);
      setSystemUpcomingMaintenance([]);
    }
  };

  // Schedule maintenance
  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedSystemDetails) return;

    if (!newMaintenance.title.trim()) {
      showAlert('Please enter a maintenance title');
      return;
    }

    if (!newMaintenance.repeat_interval_matches || parseFloat(newMaintenance.repeat_interval_matches) <= 0) {
      showAlert('Please enter a valid repeat interval (in matches)');
      return;
    }

    try {
      // Calculate runtime: 1 FRC match = 2:30 = 150 seconds = 2.5 minutes
      const repeatInterval = parseFloat(newMaintenance.repeat_interval_matches);
      const runtimePerMatchMinutes = 2.5; // 2.5 minutes per match
      const currentRuntimeMinutes = selectedSystemDetails.usage_time || 0;
      const nextDueRuntimeMinutes = currentRuntimeMinutes + (repeatInterval * runtimePerMatchMinutes);
      // Convert to hours for storage (next_due_runtime_hours field is still in hours)
      const nextDueRuntime = nextDueRuntimeMinutes / 60;

      // Insert maintenance with repeat interval and next due runtime
      const { error } = await supabase
        .from('maintenance_reviews')
        .insert([{
          system_id: selectedSystemDetails.id,
          type: newMaintenance.type,
          title: newMaintenance.title.trim(),
          description: newMaintenance.description.trim() || null,
          due_date: null, // We track by runtime, not date
          completed: false,
          repeat_interval_matches: repeatInterval,
          next_due_runtime_hours: nextDueRuntime
        }]);

      if (error) throw error;

      setNewMaintenance({ title: '', description: '', repeat_interval_matches: '', type: 'maintenance' });
      fetchMaintenanceItems(); // Refresh the upcoming maintenance list
      if (selectedSystemDetails) {
        await fetchSystemFailures(selectedSystemDetails.id); // Refresh graph data
      }
      showAlert(`Maintenance scheduled successfully. Will repeat every ${repeatInterval} match${repeatInterval !== 1 ? 'es' : ''} (${(repeatInterval * runtimePerMatchMinutes).toFixed(1)} minutes of runtime).`);
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      showAlert('Error scheduling maintenance: ' + error.message);
    }
  };

  // Prepare graph data for scatter plot (time in minutes vs events)
  const getGraphData = () => {
    const events = [];
    const currentRuntime = selectedSystemDetails?.usage_time || 0; // Already in minutes
    
    // Add failures (red dots)
    // Since we don't store runtime_at_failure, distribute failures evenly across current runtime
    // based on chronological order (oldest failures occur earlier in runtime, newest later)
    if (systemFailures && systemFailures.length > 0) {
      systemFailures.forEach((failure, index) => {
        let estimatedMinutes;
        
        if (systemFailures.length === 1) {
          // Single failure: place at midpoint of current runtime
          estimatedMinutes = currentRuntime * 0.5;
        } else {
          // Distribute failures evenly across runtime
          // Oldest failure (index 0) at 20% of runtime, newest at 90% of runtime
          // This gives some margin and assumes failures occur throughout usage, not at the very start/end
          const startPercent = 0.2; // Start at 20% of runtime
          const endPercent = 0.9;   // End at 90% of runtime
          const progress = index / (systemFailures.length - 1); // 0 to 1
          const percent = startPercent + (endPercent - startPercent) * progress;
          estimatedMinutes = currentRuntime * percent;
        }
        
        events.push({
          type: 'failure',
          minutes: estimatedMinutes,
          title: 'Failure Report',
          description: failure.comment || 'Failure reported',
          date: new Date(failure.created_at),
          color: '#dc2626'
        });
      });
    }

    // Add completed maintenance (blue dots)
    // Use completed_at timestamp to estimate runtime position
    if (systemCompletedMaintenance && systemCompletedMaintenance.length > 0) {
      const systemCreatedAt = selectedSystemDetails?.created_at 
        ? new Date(selectedSystemDetails.created_at).getTime() 
        : null;
      const currentTime = Date.now();
      const systemLifetimeMs = systemCreatedAt ? (currentTime - systemCreatedAt) : null;
      
      systemCompletedMaintenance.forEach((maintenance) => {
        let estimatedMinutes;
        
        const maintenanceTime = new Date(maintenance.completed_at || maintenance.created_at).getTime();
        
        if (systemCreatedAt && systemLifetimeMs && systemLifetimeMs > 0) {
          // Use timestamp-based estimation
          const timeSinceSystemCreation = maintenanceTime - systemCreatedAt;
          const ratio = timeSinceSystemCreation / systemLifetimeMs;
          estimatedMinutes = currentRuntime * Math.max(0, Math.min(1, ratio));
        } else {
          // Fallback: use midpoint if we can't calculate
          estimatedMinutes = currentRuntime * 0.5;
        }
        
        events.push({
          type: 'maintenance',
          minutes: estimatedMinutes,
          title: maintenance.title,
          description: maintenance.description || maintenance.title,
          date: new Date(maintenance.completed_at || maintenance.created_at),
          color: '#2563eb'
        });
      });
    }

    // Add predicted failures (light red dots)
    if (predictedWarnings && predictedWarnings.length > 0 && selectedSystemDetails) {
      predictedWarnings
        .filter(warning => warning.system_id === selectedSystemDetails.id)
        .forEach((warning) => {
          const predictedMinutes = warning.predicted_failure_runtime_minutes || 0;
          
          // Only show predicted warnings that are in the future (or near current runtime)
          if (predictedMinutes >= 0) {
            events.push({
              type: 'predicted_failure',
              minutes: predictedMinutes,
              title: 'Predicted Failure',
              description: warning.review_notes || 'Predicted failure based on MTBF analysis',
              date: new Date(warning.created_at),
              color: '#fca5a5', // Light red
              mtbfMinutes: warning.mtbf_minutes
            });
          }
        });
    }

    // Add upcoming maintenance (light blue dots)
    // Show up to 10 matches ahead (25 minutes)
    const lookAheadMinutes = 25; // 10 matches * 2.5 minutes
    const maxMinutes = currentRuntime + lookAheadMinutes;
    
    if (systemUpcomingMaintenance && systemUpcomingMaintenance.length > 0) {
      systemUpcomingMaintenance.forEach((maintenance) => {
        // Extract target runtime and repeat info from description
        // Description format: "Scheduled after X matches (target runtime: Y hours) | Repeats every Z matches"
        const desc = maintenance.description || '';
        
        // Get initial target runtime
        let initialTargetMinutes = currentRuntime + 12.5; // Default to 5 matches ahead
        const runtimeMatch = desc.match(/target runtime: ([\d.]+) hours/);
        if (runtimeMatch) {
          initialTargetMinutes = parseFloat(runtimeMatch[1]) * 60;
        } else {
          // Try to extract matches from description
          const matchesMatch = desc.match(/after ([\d.]+) match/);
          if (matchesMatch) {
            const matches = parseFloat(matchesMatch[1]);
            initialTargetMinutes = currentRuntime + (matches * 2.5);
          }
        }
        
        // Check if it repeats
        const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
        const repeatEveryMatches = repeatMatch ? parseFloat(repeatMatch[1]) : null;
        
        if (repeatEveryMatches) {
          // Show all instances within the 10-match window
          let instanceMinutes = initialTargetMinutes;
          let instanceNumber = 0;
          
          while (instanceMinutes <= maxMinutes) {
            const isDue = instanceMinutes <= currentRuntime;
            
            events.push({
              type: 'upcoming',
              minutes: instanceMinutes,
              title: maintenance.title,
              description: maintenance.description || maintenance.title,
              date: new Date(maintenance.created_at),
              color: isDue ? '#f59e0b' : '#60a5fa', // Orange if due, light blue if upcoming
              isDue: isDue,
              instanceNumber: instanceNumber
            });
            
            instanceMinutes += (repeatEveryMatches * 2.5); // Add repeat interval in minutes
            instanceNumber++;
          }
        } else {
          // Single instance
          const isDue = initialTargetMinutes <= currentRuntime;
          
          events.push({
            type: 'upcoming',
            minutes: initialTargetMinutes,
            title: maintenance.title,
            description: maintenance.description || maintenance.title,
            date: new Date(maintenance.created_at),
            color: isDue ? '#f59e0b' : '#60a5fa', // Orange if due, light blue if upcoming
            isDue: isDue
          });
        }
      });
    }

    // Sort by minutes
    return events.sort((a, b) => a.minutes - b.minutes);
  };

  // Open maintenance details modal
  const openMaintenanceDetails = (item) => {
    setSelectedMaintenanceItem(item);
    setShowMaintenanceDetails(true);
  };
  
  // Open edit maintenance modal
  const openEditMaintenance = (maintenance) => {
    // Extract original description (without matches info)
    const desc = maintenance.description || '';
    const originalDesc = desc.split('\n\n')[0] || '';
    
    setEditingMaintenance(maintenance);
    setEditMaintenanceForm({
      title: maintenance.title || '',
      description: originalDesc
    });
  };
  
  // Handle update maintenance (for completed maintenance)
  const handleUpdateMaintenance = async () => {
    if (!editingMaintenance) return;
    
    if (!editMaintenanceForm.title.trim()) {
      showAlert('Please enter a maintenance title');
      return;
    }
    
    try {
      // Preserve the matches info if it exists in the description
      const originalDesc = editingMaintenance.description || '';
      const matchesInfoMatch = originalDesc.match(/\n\n(.+)$/);
      const matchesInfo = matchesInfoMatch ? matchesInfoMatch[1] : '';
      
      const fullDescription = editMaintenanceForm.description.trim()
        ? (matchesInfo 
            ? `${editMaintenanceForm.description.trim()}\n\n${matchesInfo}`
            : editMaintenanceForm.description.trim())
        : (matchesInfo || null);
      
      const { error } = await supabase
        .from('maintenance_reviews')
        .update({
          title: editMaintenanceForm.title.trim(),
          description: fullDescription
        })
        .eq('id', editingMaintenance.id);
      
      if (error) throw error;
      
      // Refresh data
      if (selectedSystemDetails && selectedSystemDetails.id === editingMaintenance.system_id) {
        await fetchSystemFailures(editingMaintenance.system_id);
      }
      fetchMaintenanceItems();
      
      setEditingMaintenance(null);
      setEditMaintenanceForm({ title: '', description: '' });
      showAlert('Maintenance updated successfully');
    } catch (error) {
      console.error('Error updating maintenance:', error);
      showAlert('Error updating maintenance: ' + error.message);
    }
  };
  
  // Handle delete maintenance
  const handleDeleteMaintenance = async (maintenanceId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance item? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('maintenance_reviews')
        .delete()
        .eq('id', maintenanceId);
      
      if (error) throw error;
      
      // Refresh data
      fetchMaintenanceItems();
      if (selectedSystemDetails) {
        await fetchSystemFailures(selectedSystemDetails.id);
      }
      
      showAlert('Maintenance deleted successfully');
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      showAlert('Error deleting maintenance: ' + error.message);
    }
  };

  // Open confirmation modal for completing maintenance
  const openCompleteConfirmation = (item) => {
    setMaintenanceToComplete(item);
    
    // Check if maintenance is premature (before due)
    const system = item.systems || systems.find(s => s.id === item.system_id);
    if (system) {
      const currentRuntimeMinutes = system.usage_time || 0;
      const nextDueRuntimeHours = item.next_due_runtime_hours || item.nextDueRuntimeHours;
      const nextDueRuntimeMinutes = nextDueRuntimeHours ? nextDueRuntimeHours * 60 : null;
      
      if (nextDueRuntimeMinutes && currentRuntimeMinutes < nextDueRuntimeMinutes) {
        // Show premature completion confirmation
        setShowPrematureConfirm(true);
      } else {
        // Show regular confirmation
        setShowConfirmModal(true);
      }
    } else {
      // Default to regular confirmation if system not found
      setShowConfirmModal(true);
    }
  };

  // Mark maintenance as completed and reset next due runtime
  const handleCompleteMaintenance = async () => {
    if (!maintenanceToComplete) return;

    const item = maintenanceToComplete;
    const completedItemId = item.id;
    setShowConfirmModal(false);
    setShowPrematureConfirm(false);

    try {
      // Get the system to calculate the new target runtime
      const system = item.systems || systems.find(s => s.id === item.system_id);
      if (!system) {
        throw new Error('System not found');
      }

      const currentRuntimeMinutes = system.usage_time || 0;
      const runtimePerMatchMinutes = 2.5; // 2.5 minutes per match
      
      // Get repeat interval from database column or description (backward compatibility)
      let repeatIntervalMatches = item.repeat_interval_matches || item.repeatIntervalMatches;
      if (!repeatIntervalMatches) {
        const desc = item.description || '';
        const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
        if (repeatMatch) {
          repeatIntervalMatches = parseFloat(repeatMatch[1]);
        }
      }
      
      if (!repeatIntervalMatches) {
        throw new Error('Repeat interval not found');
      }
      
      // Calculate the next instance target runtime (in minutes)
      // The next instance should be scheduled after the repeat interval from now
      const nextTargetRuntimeMinutes = currentRuntimeMinutes + (repeatIntervalMatches * runtimePerMatchMinutes);
      // Convert to hours for storage (next_due_runtime_hours field is still in hours)
      const nextTargetRuntimeHours = nextTargetRuntimeMinutes / 60;
      
      // For repeating maintenance, directly update to reset for the next interval
      // We don't mark as completed first - just update the next_due_runtime_hours
      // This keeps the item visible in the activity list
      const { error: updateError } = await supabase
        .from('maintenance_reviews')
        .update({
          next_due_runtime_hours: nextTargetRuntimeHours,
          repeat_interval_matches: repeatIntervalMatches,
          updated_at: new Date().toISOString()
        })
        .eq('id', completedItemId);
      
      if (updateError) throw updateError;

      // Refresh systems first to ensure system data is up to date
      await fetchSystems();
      
      // Refresh maintenance items list from database to get updated next_due_runtime
      await fetchMaintenanceItems();
      setMaintenanceItemsKey(prev => prev + 1);
      
      if (selectedSystemDetails && selectedSystemDetails.id === item.system_id) {
        await fetchSystemFailures(item.system_id);
      }

      setMaintenanceToComplete(null);
      showAlert(`Maintenance marked as completed. Next maintenance scheduled in ${repeatIntervalMatches} match${repeatIntervalMatches !== 1 ? 'es' : ''} (${(repeatIntervalMatches * runtimePerMatchMinutes).toFixed(1)} minutes).`);
    } catch (error) {
      console.error('Error completing maintenance:', error);
      setMaintenanceToComplete(null);
      showAlert('Error completing maintenance: ' + error.message);
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
      </div>

      {!isSupabaseConfigured && (
        <div className="alert-warning" style={{ marginBottom: '2rem' }}>
          ⚠️ Supabase is not configured. Please set up your environment variables.
        </div>
      )}

      {/* Tabs */}
      <div className="main-view-tabs">
        <button
          className={`main-view-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`main-view-tab ${activeTab === 'system-management' ? 'active' : ''}`}
          onClick={() => setActiveTab('system-management')}
        >
          System Management
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-layout">
          {/* Maintenance Items Box (Left Side - Large) */}
          <div className="dashboard-left-large">
            <div className="dashboard-box maintenance-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Activity List</h3>
              </div>
              <div className="maintenance-list" key={`maintenance-list-${maintenanceItemsKey}`}>
                {(() => {
                  const filteredItems = getFilteredMaintenanceItems();
                  return filteredItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <p>No maintenance scheduled</p>
                    </div>
                  ) : (
                    <div className="maintenance-order-book">
                      {filteredItems.map((item, index) => {
                        const isDue = item.isDue;
                        const matchesRemaining = isDue ? Math.abs(item.matchesRemaining) : Math.max(0, item.matchesRemaining);
                        return (
                          <div key={`${item.id}-${index}`} className="maintenance-item" style={isDue ? { borderLeft: '4px solid #dc2626' } : {}}>
                            {isDue && (
                              <div style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                display: 'inline-block',
                                marginBottom: '0.5rem'
                              }}>
                                ⚠️ OVERDUE
                              </div>
                            )}
                            <div className="maintenance-item-header">
                              <span className="maintenance-type" style={{ backgroundColor: '#00AEEF', color: '#ffffff' }}>{item.type}</span>
                              <span className="maintenance-system">
                                {item.systems?.name || systems.find(s => s.id === item.system_id)?.name || 'Unknown System'}
                              </span>
                            </div>
                            <div className="maintenance-item-title" style={{ color: '#000000' }}>{item.title}</div>
                            {item.description && (
                              <div className="maintenance-item-description">
                                {item.description}
                              </div>
                            )}
                            <div className="maintenance-item-due" style={{ color: isDue ? '#dc2626' : '#f59e0b', marginTop: '0.5rem' }}>
                              {isDue ? (
                                <span>⚠️ Overdue ({matchesRemaining.toFixed(1)} matches)</span>
                              ) : (
                                <span>⏱️ {matchesRemaining.toFixed(1)} matches remaining ({(matchesRemaining * 2.5).toFixed(1)} minutes)</span>
                              )}
                            </div>
                            <div className="maintenance-item-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openMaintenanceDetails(item)}
                                style={{ marginRight: '0.5rem' }}
                              >
                                View Details
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openCompleteConfirmation(item)}
                              >
                                Completed
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Predicted Warnings Box */}
            <div className="dashboard-box maintenance-box" style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Predicted Warnings</h3>
              </div>
              <div className="maintenance-list">
                {(() => {
                  const filteredWarnings = getFilteredPredictedWarnings();
                  return filteredWarnings.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <p>No predicted warnings</p>
                      <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '0.5rem' }}>
                        Warnings will appear here based on MTBF analysis after 2 or more failures are reported.
                      </small>
                    </div>
                  ) : (
                    <div className="maintenance-order-book">
                      {filteredWarnings.map((warning, index) => {
                        const isDue = warning.isDue;
                        const matchesRemaining = isDue ? Math.abs(warning.matchesUntilPredicted) : Math.max(0, warning.matchesUntilPredicted);
                        return (
                          <div key={`${warning.id}-${index}`} className="maintenance-item" style={isDue ? { borderLeft: '4px solid #f59e0b' } : { borderLeft: '4px solid #3b82f6' }}>
                            {isDue && (
                              <div style={{
                                background: '#f59e0b',
                                color: '#ffffff',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                display: 'inline-block',
                                marginBottom: '0.5rem'
                              }}>
                                ⚠️ DUE
                              </div>
                            )}
                            <div className="maintenance-item-header">
                              <span className="maintenance-type" style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}>Predicted Review</span>
                              <span className="maintenance-system">
                                {warning.systems?.name || systems.find(s => s.id === warning.system_id)?.name || 'Unknown System'}
                              </span>
                            </div>
                            <div className="maintenance-item-title" style={{ color: '#000000' }}>
                              MTBF-Based Predictive Review
                            </div>
                            <div className="maintenance-item-description" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                              {warning.review_notes}
                            </div>
                            {warning.likely_failures && warning.likely_failures.length > 0 && (
                              <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '0.875rem', color: '#374151' }}>Common failure components:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                  {warning.likely_failures.map((component, idx) => (
                                    <span key={idx} style={{
                                      background: '#fef3c7',
                                      color: '#92400e',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '500'
                                    }}>
                                      {component}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="maintenance-item-due" style={{ color: isDue ? '#f59e0b' : '#3b82f6', marginTop: '0.5rem' }}>
                              {isDue ? (
                                <span>⚠️ Predicted failure time reached ({Math.abs(matchesRemaining).toFixed(1)} matches ago)</span>
                              ) : (
                                <span>📊 Predicted in {matchesRemaining.toFixed(1)} matches ({(warning.minutesUntilPredicted).toFixed(1)} minutes) | MTBF: {(warning.mtbf_minutes / 60).toFixed(1)} hours</span>
                              )}
                            </div>
                            <div className="maintenance-item-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDismissPredictedWarning(warning.id)}
                                style={{ width: '100%' }}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Side - Two Smaller Boxes */}
          <div className="dashboard-right">
            {/* Wpilog Upload Box */}
            <div className="dashboard-box">
              <h3>Upload Wpilog</h3>
              <div className="form-group">
                <label>Runtime (minutes)</label>
                <input
                  type="number"
                  value={wpilogTime}
                  onChange={(e) => setWpilogTime(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="Enter runtime in minutes"
                  disabled={uploadingWpilog || !!wpilogFile}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                  This will add the runtime to all systems
                </small>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Wpilog File (optional)</label>
                <input
                  type="file"
                  accept=".wpilog"
                  onChange={(e) => {
                    setWpilogFile(e.target.files[0]);
                    if (e.target.files[0]) {
                      setWpilogTime(''); // Clear manual time when file is selected
                    }
                  }}
                  disabled={uploadingWpilog || !!wpilogTime}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
                {wpilogFile && (
                  <p style={{ margin: '0.5rem 0', color: '#2563eb', fontSize: '0.9rem' }}>
                    Selected: {wpilogFile.name}
                  </p>
                )}
                <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                  Upload a .wpilog file to automatically parse runtime, or enter time manually above
                </small>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleWpilogUpload}
                disabled={uploadingWpilog || (!wpilogFile && !wpilogTime)}
                style={{ width: '100%' }}
              >
                {uploadingWpilog ? 'Processing...' : (wpilogFile ? 'Upload & Process Log' : 'Add Time to Systems')}
              </button>
            </div>

            {/* Failure Reporting Box */}
            <div className="dashboard-box report-box">
              <h3>Report</h3>
              <div className="form-group">
                <label>Select System</label>
                <select
                  value={selectedSystemForFailure}
                  onChange={(e) => {
                    setSelectedSystemForFailure(e.target.value);
                    setSelectedPartsForFailure([]); // Reset selected parts when system changes
                    setPartsSearchTerm(''); // Reset search term
                    setShowPartsDropdown(false); // Close dropdown
                  }}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                >
                  <option value="">-- Select System --</option>
                  {systems.map(system => (
                    <option key={system.id} value={system.id}>{system.name}</option>
                  ))}
                </select>
              </div>
              {selectedSystemForFailure && getLinkedPartsForSystem(parseInt(selectedSystemForFailure)).length > 0 && (
                <div className="form-group">
                  <label>Select Linked Parts</label>
                  <div className="searchable-dropdown-container">
                    {/* Selected parts display */}
                    {selectedPartsForFailure.length > 0 && (
                      <div className="selected-parts-tags">
                        {selectedPartsForFailure.map(partId => {
                          const part = parts.find(p => p.id === partId);
                          return part ? (
                            <span key={partId} className="part-tag">
                              {part.name}
                              <button
                                type="button"
                                onClick={() => removeSelectedPart(partId)}
                                className="part-tag-remove"
                                aria-label={`Remove ${part.name}`}
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    {/* Search input and dropdown */}
                    <div className="searchable-dropdown-wrapper">
                      <input
                        type="text"
                        value={partsSearchTerm}
                        onChange={(e) => {
                          setPartsSearchTerm(e.target.value);
                          setShowPartsDropdown(true);
                        }}
                        onFocus={() => setShowPartsDropdown(true)}
                        placeholder="Search parts..."
                        className="parts-search-input"
                      />
                      
                      {showPartsDropdown && (
                        <div className="parts-dropdown">
                          {getFilteredParts(parseInt(selectedSystemForFailure)).length === 0 ? (
                            <div className="dropdown-empty">
                              {partsSearchTerm.trim() ? 'No parts found' : 'No parts available'}
                            </div>
                          ) : (
                            getFilteredParts(parseInt(selectedSystemForFailure)).map(part => {
                              const isSelected = selectedPartsForFailure.includes(part.id);
                              return (
                                <div
                                  key={part.id}
                                  className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                                  onClick={() => togglePartSelection(part.id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    style={{ marginRight: '0.5rem' }}
                                  />
                                  <span>{part.name}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Components Needing Replacement/Remake (comma-separated)</label>
                <input
                  type="text"
                  value={failureComponents}
                  onChange={(e) => setFailureComponents(e.target.value)}
                  placeholder="e.g., Motor, Gear, Bearing"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
              </div>
              <div className="form-group">
                <label>Failure Comment *</label>
                <textarea
                  value={failureComment}
                  onChange={(e) => setFailureComment(e.target.value)}
                  rows={4}
                  placeholder="Describe the failure..."
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', resize: 'vertical' }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleReportFailure}
                style={{ width: '100%' }}
              >
                Report Failure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Management Tab */}
      {activeTab === 'system-management' && (
        <>
          <div className="lifecycle-header" style={{ marginTop: '2rem' }}>
            <h3>Systems</h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddSystem(true)}
            >
              + Add System
            </button>
          </div>

          {systems.length === 0 ? (
            <div className="empty-state">
              <p>No systems found. Add a system to start tracking lifecycle data.</p>
            </div>
          ) : (
            <div className="systems-categories-container">
              {/* In Usage Category */}
              <div className="system-category">
                <h4 className="category-header">In Usage</h4>
                <div 
                  className="systems-grid category-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'in-usage')}
                >
                  {systems.filter(s => s.in_usage !== false).map((system) => (
                    <div 
                      key={system.id} 
                      className="system-card draggable-system"
                      draggable
                      onDragStart={(e) => handleDragStart(e, system.id)}
                    >
                      <div className="system-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <h3 style={{ margin: 0 }}>{system.name}</h3>
                          <label className="usage-toggle-switch">
                            <input
                              type="checkbox"
                              checked={system.in_usage !== false}
                              onChange={() => handleToggleUsageStatus(system.id, system.in_usage !== false)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">
                              {system.in_usage !== false ? 'In Usage' : 'Not In Usage'}
                            </span>
                          </label>
                        </div>
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
                        <label>Usage Time (minutes):</label>
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
                      <div className="system-usage" style={{ marginTop: '1rem' }}>
                        <label>Time Since Last Maintenance (minutes):</label>
                        <input
                          type="number"
                          value={(system.time_since_last_maintenance || 0).toFixed(2)}
                          readOnly
                          disabled
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                      
                      {/* Linked Parts and Subsystems */}
                      <div className="system-links" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Linked Parts:</strong> {systemParts[system.id]?.length || 0}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Linked Subsystems:</strong> {systemSubsystems[system.id]?.length || 0}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openLinkPartsModal(system)}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          Link Parts/Subsystems
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openSystemDetails(system)}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          View Details
                        </button>
                      </div>

                      <div className="system-meta">
                        <small>Created: {new Date(system.created_at).toLocaleDateString()}</small>
                        {system.updated_at && (
                          <small>Updated: {new Date(system.updated_at).toLocaleDateString()}</small>
                        )}
                      </div>
                    </div>
                  ))}
                  {systems.filter(s => s.in_usage !== false).length === 0 && (
                    <div className="empty-category">
                      <p>No systems in usage. Drag systems here to mark them as in usage.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Not in Usage Category */}
              <div className="system-category">
                <h4 className="category-header">Not in Usage</h4>
                <div 
                  className="systems-grid category-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'not-in-usage')}
                >
                  {systems.filter(s => s.in_usage === false).map((system) => (
                    <div 
                      key={system.id} 
                      className="system-card draggable-system"
                      draggable
                      onDragStart={(e) => handleDragStart(e, system.id)}
                    >
                      <div className="system-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <h3 style={{ margin: 0 }}>{system.name}</h3>
                          <label className="usage-toggle-switch">
                            <input
                              type="checkbox"
                              checked={system.in_usage !== false}
                              onChange={() => handleToggleUsageStatus(system.id, system.in_usage !== false)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">
                              {system.in_usage !== false ? 'In Usage' : 'Not In Usage'}
                            </span>
                          </label>
                        </div>
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
                        <label>Usage Time (minutes):</label>
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
                      <div className="system-usage" style={{ marginTop: '1rem' }}>
                        <label>Time Since Last Maintenance (minutes):</label>
                        <input
                          type="number"
                          value={(system.time_since_last_maintenance || 0).toFixed(2)}
                          readOnly
                          disabled
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                      
                      {/* Linked Parts and Subsystems */}
                      <div className="system-links" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Linked Parts:</strong> {systemParts[system.id]?.length || 0}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Linked Subsystems:</strong> {systemSubsystems[system.id]?.length || 0}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openLinkPartsModal(system)}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          Link Parts/Subsystems
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openSystemDetails(system)}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          View Details
                        </button>
                      </div>

                      <div className="system-meta">
                        <small>Created: {new Date(system.created_at).toLocaleDateString()}</small>
                        {system.updated_at && (
                          <small>Updated: {new Date(system.updated_at).toLocaleDateString()}</small>
                        )}
                      </div>
                    </div>
                  ))}
                  {systems.filter(s => s.in_usage === false).length === 0 && (
                    <div className="empty-category">
                      <p>No systems not in usage. Drag systems here to mark them as not in usage.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
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
                <label>Initial Usage Time (minutes)</label>
                <input
                  type="number"
                  value={(newSystem.usage_time || 0).toFixed(1)}
                  onChange={(e) => setNewSystem({ ...newSystem, usage_time: parseFloat(e.target.value) || 0 })}
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

      {/* Link Parts/Subsystems Modal */}
      {showLinkPartsModal && linkingSystem && (
        <div className="modal-overlay" onClick={() => setShowLinkPartsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Link Parts/Subsystems to {linkingSystem.name}</h3>
              <button className="modal-close" onClick={() => setShowLinkPartsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Parts</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.5rem' }}>
                  {parts.length === 0 ? (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No parts available</p>
                  ) : (
                    parts.map(part => (
                      <label key={part.id} style={{ display: 'block', padding: '0.25rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedPartsToLink.includes(part.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPartsToLink([...selectedPartsToLink, part.id]);
                            } else {
                              setSelectedPartsToLink(selectedPartsToLink.filter(id => id !== part.id));
                            }
                          }}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {part.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Subsystems</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.5rem' }}>
                  {subsystems.length === 0 ? (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No subsystems available</p>
                  ) : (
                    subsystems.map(subsystem => (
                      <label key={subsystem.id} style={{ display: 'block', padding: '0.25rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSubsystemsToLink.includes(subsystem.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubsystemsToLink([...selectedSubsystemsToLink, subsystem.id]);
                            } else {
                              setSelectedSubsystemsToLink(selectedSubsystemsToLink.filter(id => id !== subsystem.id));
                            }
                          }}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {subsystem.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowLinkPartsModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleLinkParts} className="btn btn-primary">
                  Save Links
                </button>
              </div>
            </div>
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

      {/* Premature Completion Confirmation Modal */}
      {showPrematureConfirm && maintenanceToComplete && (
        <div className="modal-overlay" onClick={() => { setShowPrematureConfirm(false); setMaintenanceToComplete(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Premature Completion</h3>
              <button className="modal-close" onClick={() => { setShowPrematureConfirm(false); setMaintenanceToComplete(null); }}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                This maintenance is not due yet. Do you want to complete it prematurely?
              </p>
              <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Maintenance: <strong>"{maintenanceToComplete.title}"</strong>
              </p>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setShowPrematureConfirm(false);
                    setMaintenanceToComplete(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={() => { setShowPrematureConfirm(false); setShowConfirmModal(true); }} className="btn btn-primary">
                  Yes, Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Completing Maintenance */}
      {showConfirmModal && maintenanceToComplete && (
        <div className="modal-overlay" onClick={() => { setShowConfirmModal(false); setMaintenanceToComplete(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Completion</h3>
              <button className="modal-close" onClick={() => { setShowConfirmModal(false); setMaintenanceToComplete(null); }}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Mark <strong>"{maintenanceToComplete.title}"</strong> as completed?
              </p>
              <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.6' }}>
                This will mark the maintenance as completed and reset it for the next interval.
              </p>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setMaintenanceToComplete(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleCompleteMaintenance} className="btn btn-primary">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Details Modal */}
      {showMaintenanceDetails && selectedMaintenanceItem && (
        <div className="modal-overlay" onClick={() => setShowMaintenanceDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Maintenance Details</h3>
              <button className="modal-close" onClick={() => setShowMaintenanceDetails(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Type</label>
                <div style={{ 
                  display: 'inline-block', 
                  background: '#2563eb', 
                  color: '#ffffff', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {selectedMaintenanceItem.type}
                </div>
              </div>
              <div className="form-group">
                <label>Title</label>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{selectedMaintenanceItem.title}</p>
              </div>
              <div className="form-group">
                <label>System</label>
                <p style={{ margin: 0 }}>
                  {selectedMaintenanceItem.systems?.name || systems.find(s => s.id === selectedMaintenanceItem.system_id)?.name || 'Unknown System'}
                </p>
              </div>
              {selectedMaintenanceItem.description && (
                <div className="form-group">
                  <label>Description / Notes</label>
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {selectedMaintenanceItem.description}
                  </div>
                </div>
              )}
              {selectedMaintenanceItem.due_date && (
                <div className="form-group">
                  <label>Due Date</label>
                  <p style={{ margin: 0 }}>{new Date(selectedMaintenanceItem.due_date).toLocaleDateString()}</p>
                </div>
              )}
              <div className="modal-actions">
                <button onClick={() => setShowMaintenanceDetails(false)} className="btn btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Maintenance Modal (for completed maintenance) */}
      {editingMaintenance && (
        <div className="modal-overlay" onClick={() => setEditingMaintenance(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Maintenance</h3>
              <button className="modal-close" onClick={() => setEditingMaintenance(null)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={editMaintenanceForm.title}
                  onChange={(e) => setEditMaintenanceForm({ ...editMaintenanceForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editMaintenanceForm.description}
                  onChange={(e) => setEditMaintenanceForm({ ...editMaintenanceForm, description: e.target.value })}
                  rows={4}
                  placeholder="Maintenance description..."
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', resize: 'vertical' }}
                />
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setEditingMaintenance(null);
                    setEditMaintenanceForm({ title: '', description: '' });
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleUpdateMaintenance} className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Details Modal */}
      {showSystemDetails && selectedSystemDetails && (
        <div className="modal-overlay" onClick={() => setShowSystemDetails(false)}>
          <div className="modal-content system-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{selectedSystemDetails.name} - Details</h3>
              <button className="modal-close" onClick={() => setShowSystemDetails(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              {/* System Info */}
              <div className="system-details-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <strong>Current Runtime:</strong> {(selectedSystemDetails.usage_time || 0).toFixed(1)} minutes 
                    {selectedSystemDetails.usage_time > 0 && (
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                        ({Math.round((selectedSystemDetails.usage_time || 0) / 2.5)} matches)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Graph Section */}
              <div className="system-details-section">
                <h4>Timeline: Events & Incidents</h4>
                <div className="graph-container">
                  {systemFailures.length === 0 && systemCompletedMaintenance.length === 0 && systemUpcomingMaintenance.length === 0 ? (
                    <div className="graph-empty">No events recorded yet</div>
                  ) : (
                    <IncidentsGraph 
                      data={getGraphData()} 
                      currentRuntimeMinutes={selectedSystemDetails.usage_time || 0}
                      systemCreated={selectedSystemDetails.created_at}
                    />
                  )}
                </div>
              </div>

              {/* Reports Section */}
              <div className="system-details-section">
                <h4>Reports</h4>
                <div className="reports-list">
                  {systemFailures.length === 0 ? (
                    <div className="empty-state-small">No reports available</div>
                  ) : (
                    systemFailures.map(failure => (
                      <div key={failure.id} className="report-item">
                        <div 
                          className="report-item-header"
                          onClick={() => setExpandedReportId(expandedReportId === failure.id ? null : failure.id)}
                        >
                          <div>
                            <strong>{new Date(failure.created_at).toLocaleString()}</strong>
                            <span className="report-components-count">
                              {failure.components_needing_replacement?.length || 0} component(s)
                            </span>
                          </div>
                          <span className="report-toggle">
                            {expandedReportId === failure.id ? '▼' : '▶'}
                          </span>
                        </div>
                        {expandedReportId === failure.id && (
                          <div className="report-item-details">
                            <div className="report-detail-section">
                              <strong>Components Needing Replacement:</strong>
                              {failure.components_needing_replacement && failure.components_needing_replacement.length > 0 ? (
                                <ul className="components-list">
                                  {failure.components_needing_replacement.map((component, idx) => (
                                    <li key={idx}>{component}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="no-components">None specified</p>
                              )}
                            </div>
                            <div className="report-detail-section">
                              <strong>Comment:</strong>
                              <p className="report-comment">{failure.comment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Maintenance Section */}
              <div className="system-details-section">
                <h4>Completed Maintenance</h4>
                <div className="reports-list">
                  {systemCompletedMaintenance.length === 0 ? (
                    <div className="empty-state-small">No completed maintenance recorded</div>
                  ) : (
                    systemCompletedMaintenance.map(maintenance => (
                      <div key={maintenance.id} className="report-item">
                        <div 
                          className="report-item-header"
                          onClick={() => setExpandedReportId(expandedReportId === maintenance.id ? null : maintenance.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <strong>{maintenance.title}</strong>
                            <span className="report-components-count" style={{ marginLeft: '0.5rem', color: '#2563eb' }}>
                              {maintenance.completed_at 
                                ? new Date(maintenance.completed_at).toLocaleDateString()
                                : 'Completed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditMaintenance(maintenance);
                              }}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Edit
                            </button>
                            <span className="report-toggle">
                              {expandedReportId === maintenance.id ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>
                        {expandedReportId === maintenance.id && (
                          <div className="report-item-details">
                            <div className="report-detail-section">
                              <strong>Type:</strong>
                              <span style={{ 
                                display: 'inline-block', 
                                background: '#2563eb', 
                                color: '#ffffff', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                marginLeft: '0.5rem'
                              }}>
                                {maintenance.type}
                              </span>
                            </div>
                            {maintenance.description && (
                              <div className="report-detail-section">
                                <strong>Description:</strong>
                                <p className="report-comment" style={{ whiteSpace: 'pre-wrap' }}>
                                  {maintenance.description.split('\n\n')[0]}
                                </p>
                              </div>
                            )}
                            {maintenance.completed_at && (
                              <div className="report-detail-section">
                                <strong>Completed At:</strong>
                                <p>{new Date(maintenance.completed_at).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Edit Current Maintenance Section */}
              <div className="system-details-section">
                <h4>Edit Current Maintenance</h4>
                <div className="reports-list">
                  {systemUpcomingMaintenance.length === 0 ? (
                    <div className="empty-state-small">No upcoming maintenance scheduled</div>
                  ) : (
                    systemUpcomingMaintenance.map(maintenance => {
                      // Extract matches info from description
                      const desc = maintenance.description || '';
                      const matchesMatch = desc.match(/after ([\d.]+) match/);
                      const matches = matchesMatch ? parseFloat(matchesMatch[1]) : null;
                      const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
                      const isRepeating = !!repeatMatch;
                      
                      return (
                        <div key={maintenance.id} className="report-item">
                          <div 
                            className="report-item-header"
                            onClick={() => setExpandedReportId(expandedReportId === maintenance.id ? null : maintenance.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div>
                              <strong>{maintenance.title}</strong>
                              <span className="report-components-count" style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
                                {matches ? `Due after ${matches} match${matches !== 1 ? 'es' : ''}` : 'Scheduled'}
                                {isRepeating && ' (Repeating)'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMaintenance(maintenance.id);
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#dc2626', color: '#ffffff' }}
                              >
                                Delete
                              </button>
                              <span className="report-toggle">
                                {expandedReportId === maintenance.id ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>
                          {expandedReportId === maintenance.id && (
                            <div className="report-item-details">
                              <div className="report-detail-section">
                                <strong>Type:</strong>
                                <span style={{ 
                                  display: 'inline-block', 
                                  background: '#2563eb', 
                                  color: '#ffffff', 
                                  padding: '0.25rem 0.75rem', 
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  marginLeft: '0.5rem'
                                }}>
                                  {maintenance.type}
                                </span>
                              </div>
                              {maintenance.description && (
                                <div className="report-detail-section">
                                  <strong>Description:</strong>
                                  <p className="report-comment" style={{ whiteSpace: 'pre-wrap' }}>
                                    {maintenance.description.split('\n\n')[0]}
                                  </p>
                                </div>
                              )}
                              {matches && (
                                <div className="report-detail-section">
                                  <strong>Scheduled:</strong>
                                  <p>Due after {matches} match{matches !== 1 ? 'es' : ''} ({(matches * 2.5 / 60).toFixed(2)} hours of additional runtime)</p>
                                </div>
                              )}
                              {isRepeating && (
                                <div className="report-detail-section">
                                  <strong>Repeat Schedule:</strong>
                                  <p>Repeats every {repeatMatch[1]} match{parseFloat(repeatMatch[1]) !== 1 ? 'es' : ''}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Schedule Maintenance Section */}
              <div className="system-details-section">
                <h4>Schedule Maintenance</h4>
                <form onSubmit={handleScheduleMaintenance} className="schedule-maintenance-form">
                  <div className="form-group">
                    <label>Maintenance Type</label>
                    <select
                      value={newMaintenance.type}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, type: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="review">Review</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={newMaintenance.title}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, title: e.target.value })}
                      placeholder="e.g., Grease wheel bearings"
                      required
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={newMaintenance.description}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                      rows={3}
                      placeholder="Additional details..."
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Repeat Interval (Matches) *</label>
                    <input
                      type="number"
                      value={newMaintenance.repeat_interval_matches}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, repeat_interval_matches: e.target.value })}
                      placeholder="e.g., 20"
                      min="1"
                      step="1"
                      required
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginBottom: '1rem' }}>
                      1 FRC match = 2:30 (2.5 minutes) of runtime
                      {newMaintenance.repeat_interval_matches && parseFloat(newMaintenance.repeat_interval_matches) > 0 && (
                        <span style={{ display: 'block', marginTop: '0.25rem' }}>
                          Maintenance will repeat every {newMaintenance.repeat_interval_matches} match{parseFloat(newMaintenance.repeat_interval_matches) !== 1 ? 'es' : ''} ({(parseFloat(newMaintenance.repeat_interval_matches) * 2.5 / 60).toFixed(2)} hours)
                        </span>
                      )}
                    </small>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Schedule Maintenance
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Graph Component for Timeline Scatter Plot
function IncidentsGraph({ data, currentRuntimeMinutes, systemCreated }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Calculate default values using function initializers to avoid calling hooks conditionally
  const calculateDefaults = () => {
    if (!data || data.length === 0) {
      return {
        defaultMinMinutes: 0,
        defaultMaxMinutes: 10,
        defaultYAxisMax: 5
      };
    }

    // Calculate default time range: from 0 to current runtime + 10 matches (25 minutes ahead)
    const defaultMaxMinutes = Math.max(
      currentRuntimeMinutes + 25, // 10 matches ahead
      ...data.map(d => d.minutes),
      10 // minimum range
    );
    const defaultMinMinutes = 0;

    // Calculate default Y-axis max based on actual data
    const timeBucketSize = 0.1;
    const eventsByTimeForDefault = {};
    data.forEach((event) => {
      const bucketKey = Math.round(event.minutes / timeBucketSize) * timeBucketSize;
      if (!eventsByTimeForDefault[bucketKey]) {
        eventsByTimeForDefault[bucketKey] = [];
      }
      eventsByTimeForDefault[bucketKey].push(event);
    });
    const defaultYAxisMax = Math.max(
      ...Object.values(eventsByTimeForDefault).map(events => events.length),
      5 // minimum of 5
    );

    return { defaultMinMinutes, defaultMaxMinutes, defaultYAxisMax };
  };

  // State for axis controls - must be declared before any early returns
  const defaults = calculateDefaults();
  const [xAxisMin, setXAxisMin] = useState(defaults.defaultMinMinutes);
  const [xAxisMax, setXAxisMax] = useState(defaults.defaultMaxMinutes);
  const [yAxisMax, setYAxisMax] = useState(defaults.defaultYAxisMax);

  // Early return after all hooks are declared
  if (!data || data.length === 0) {
    return <div className="graph-empty">No events recorded yet</div>;
  }

  const graphHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = 800;
  const plotHeight = graphHeight - padding.top - padding.bottom;
  const plotWidth = graphWidth - padding.left - padding.right;

  // Use controlled axis values
  const maxMinutes = xAxisMax;
  const minMinutes = xAxisMin;

  // Group events by time (round to nearest 0.1 minutes for grouping)
  // Count how many events occur at each time point
  const timeBucketSize = 0.1; // Group events within 0.1 minutes
  const eventsByTime = {};
  
  data.forEach((event) => {
    const bucketKey = Math.round(event.minutes / timeBucketSize) * timeBucketSize;
    if (!eventsByTime[bucketKey]) {
      eventsByTime[bucketKey] = [];
    }
    eventsByTime[bucketKey].push(event);
  });
  
  // Y-axis: number of events at each time point (not cumulative)
  // Use controlled yAxisMax value
  const yScale = (eventCount) => {
    // Invert y-axis: higher event count at top (SVG y=0 is at top)
    // Cap eventCount at yAxisMax for scaling purposes
    const normalized = Math.min(eventCount, yAxisMax) / yAxisMax;
    return graphHeight - padding.bottom - (normalized * plotHeight);
  };

  // Assign event count (number of events at this time) to each event
  const eventDataWithCount = data.map((event) => {
    const bucketKey = Math.round(event.minutes / timeBucketSize) * timeBucketSize;
    const eventsAtThisTime = eventsByTime[bucketKey].length;
    return {
      ...event,
      eventCount: eventsAtThisTime // Number of events at this time point
    };
  });

  // X-axis scale: minutes to pixels (accounting for minMinutes)
  const xScale = (minutes) => {
    const range = maxMinutes - minMinutes;
    if (range <= 0) return padding.left;
    return padding.left + ((minutes - minMinutes) / range) * plotWidth;
  };

  // Filter events to only show those within the X-axis range
  const filteredEventData = eventDataWithCount.filter(
    event => event.minutes >= minMinutes && event.minutes <= maxMinutes
  );

  const currentRuntimeX = currentRuntimeMinutes >= minMinutes && currentRuntimeMinutes <= maxMinutes 
    ? xScale(currentRuntimeMinutes) 
    : null;

  return (
    <div className="timeline-graph-container">
      {/* Axis Controls */}
      <div className="axis-controls">
        <div className="axis-control-group">
          <label htmlFor="x-axis-min">X-Axis Min (minutes):</label>
          <input
            id="x-axis-min"
            type="number"
            min="0"
            step="0.1"
            value={xAxisMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setXAxisMin(Math.min(val, xAxisMax - 0.1));
            }}
            className="axis-input"
          />
        </div>
        <div className="axis-control-group">
          <label htmlFor="x-axis-max">X-Axis Max (minutes):</label>
          <input
            id="x-axis-max"
            type="number"
            min={xAxisMin + 0.1}
            step="0.1"
            value={xAxisMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || xAxisMin + 1;
              setXAxisMax(Math.max(val, xAxisMin + 0.1));
            }}
            className="axis-input"
          />
        </div>
        <div className="axis-control-group">
          <label htmlFor="y-axis-max">Y-Axis Max (events):</label>
          <input
            id="y-axis-max"
            type="number"
            min="1"
            step="1"
            value={yAxisMax}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setYAxisMax(Math.max(1, val));
            }}
            className="axis-input"
          />
        </div>
        <button
          onClick={() => {
            const currentDefaults = calculateDefaults();
            setXAxisMin(currentDefaults.defaultMinMinutes);
            setXAxisMax(currentDefaults.defaultMaxMinutes);
            setYAxisMax(currentDefaults.defaultYAxisMax);
          }}
          className="axis-reset-btn"
        >
          Reset to Defaults
        </button>
      </div>
      <div className="timeline-graph-wrapper">
        <svg width={graphWidth} height={graphHeight} className="timeline-graph" style={{ overflow: 'visible' }}>
          {/* Vertical grid lines - show appropriate intervals based on controlled range */}
          {(() => {
            const range = maxMinutes - minMinutes;
            const interval = range > 0 ? Math.max(1, Math.ceil(range / 10)) : 1;
            const numGridLines = Math.ceil(range / interval);
            const gridLines = [];
            for (let i = 0; i <= numGridLines; i++) {
              const minutes = minMinutes + (interval * i);
              if (minutes > maxMinutes) break;
              const x = xScale(minutes);
              gridLines.push(
                <g key={`v-${i}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={graphHeight - padding.bottom}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={x}
                    y={graphHeight - padding.bottom + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {minutes.toFixed(1)}m
                  </text>
                </g>
              );
            }
            return gridLines;
          })()}

          {/* Horizontal grid lines - show event count intervals */}
          {(() => {
            const gridLines = [];
            // Show grid lines for 1 through 5 events
            for (let i = 1; i <= yAxisMax; i++) {
              const eventCount = i;
              const y = yScale(eventCount);
              gridLines.push(
                <g key={`h-${i}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={graphWidth - padding.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {eventCount}
                  </text>
                </g>
              );
            }
            return gridLines;
          })()}

          {/* Y-axis line */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={graphHeight - padding.bottom}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* X-axis line */}
          <line
            x1={padding.left}
            y1={graphHeight - padding.bottom}
            x2={graphWidth - padding.right}
            y2={graphHeight - padding.bottom}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Current runtime indicator (dotted vertical line) */}
          {currentRuntimeX !== null && currentRuntimeMinutes > 0 && (
            <g>
              <line
                x1={currentRuntimeX}
                y1={padding.top}
                x2={currentRuntimeX}
                y2={graphHeight - padding.bottom}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              <text
                x={currentRuntimeX}
                y={padding.top - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#10b981"
                fontWeight="600"
              >
                Current
              </text>
            </g>
          )}

          {/* Event dots */}
          {filteredEventData.map((event, index) => {
            const x = xScale(event.minutes);
            const y = yScale(event.eventCount);
            const isHovered = hoveredPoint === index;

            // Calculate tooltip dimensions
            const tooltipWidth = 180;
            const tooltipHeight = event.isDue ? 65 : 50;
            const tooltipPadding = 12;
            const safeZone = 30; // Larger safe zone from edges to avoid clipping

            // Calculate tooltip position to avoid clipping
            // Start with centered on dot
            let tooltipX = x - (tooltipWidth / 2);
            let tooltipY = y - tooltipHeight - tooltipPadding;
            
            // Calculate strict visible bounds with safe zones
            const minX = padding.left + safeZone;
            const maxX = graphWidth - padding.right - tooltipWidth - safeZone;
            const minY = padding.top + safeZone;
            const maxY = graphHeight - padding.bottom - tooltipHeight - safeZone;
            
            // Clamp tooltip X to stay within bounds
            tooltipX = Math.max(minX, Math.min(maxX, tooltipX));
            
            // Handle vertical positioning - prefer above, fallback to below
            const spaceAbove = y - padding.top;
            const spaceBelow = graphHeight - padding.bottom - y;
            
            if (spaceAbove >= tooltipHeight + tooltipPadding + safeZone) {
              // Enough space above - position above
              tooltipY = y - tooltipHeight - tooltipPadding;
            } else if (spaceBelow >= tooltipHeight + tooltipPadding + safeZone) {
              // Not enough space above, but enough below - position below
              tooltipY = y + tooltipPadding + 10;
            } else {
              // Not enough space in either direction - position in available space
              if (spaceAbove > spaceBelow) {
                tooltipY = Math.max(minY, padding.top + safeZone);
              } else {
                tooltipY = Math.min(maxY, graphHeight - padding.bottom - tooltipHeight - safeZone);
              }
            }
            
            // Final clamp to ensure tooltip stays within bounds
            tooltipY = Math.max(minY, Math.min(maxY, tooltipY));
            
            // Calculate text x position (centered in tooltip rect)
            const textX = tooltipX + (tooltipWidth / 2);

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 6}
                  fill={event.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Due indicator - exclamation mark for maintenance that's due */}
                {event.isDue && event.type === 'upcoming' && (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 10 : 8}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#dc2626"
                      fontWeight="bold"
                    >
                      !
                    </text>
                  </g>
                )}
                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      fill="rgba(0, 0, 0, 0.8)"
                      rx="4"
                    />
                    <text
                      x={textX}
                      y={tooltipY + 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#ffffff"
                      fontWeight="600"
                    >
                      {event.title}
                    </text>
                    {event.isDue && (
                      <text
                        x={textX}
                        y={tooltipY + 35}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#fca5a5"
                        fontWeight="600"
                      >
                        DUE NOW
                      </text>
                    )}
                    <text
                      x={textX}
                      y={tooltipY + (event.isDue ? 50 : 40)}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#e5e7eb"
                    >
                      {event.description.length > 30 
                        ? event.description.substring(0, 30) + '...' 
                        : event.description}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={15}
            y={graphHeight / 2}
            fontSize="12"
            fill="#6b7280"
            transform={`rotate(-90, 15, ${graphHeight / 2})`}
            textAnchor="middle"
          >
            Number of Events
          </text>

          {/* X-axis label */}
          <text
            x={graphWidth / 2}
            y={graphHeight - 5}
            fontSize="12"
            fill="#6b7280"
            textAnchor="middle"
          >
            Time (minutes)
          </text>
        </svg>
      </div>
      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#2563eb' }}></span>
          <span>Completed Maintenance</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#fca5a5' }}></span>
          <span>Predicted Failure</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#60a5fa' }}></span>
          <span>Upcoming Maintenance</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Due Maintenance</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#dc2626' }}></span>
          <span>Failure Report</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ borderColor: '#10b981' }}></span>
          <span>Current Runtime</span>
        </div>
      </div>
    </div>
  );
}

export default Lifecycle;
