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
  const [selectedSystemForFailure, setSelectedSystemForFailure] = useState('');
  const [failureComponents, setFailureComponents] = useState('');
  const [failureComment, setFailureComment] = useState('');
  const [selectedPartsForFailure, setSelectedPartsForFailure] = useState([]);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const [wpilogFile, setWpilogFile] = useState(null);
  const [uploadingWpilog, setUploadingWpilog] = useState(false);

  // System Management state
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
    due_after_matches: '',
    type: 'maintenance',
    repeat: true,
    repeat_every_matches: ''
  });
  const [matchesAhead, setMatchesAhead] = useState(10); // Default to 10 matches ahead
  
  // Maintenance Details Modal state
  const [showMaintenanceDetails, setShowMaintenanceDetails] = useState(false);
  const [selectedMaintenanceItem, setSelectedMaintenanceItem] = useState(null);
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [maintenanceToComplete, setMaintenanceToComplete] = useState(null);
  
  // Edit Maintenance Modal state
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [editMaintenanceForm, setEditMaintenanceForm] = useState({
    title: '',
    description: ''
  });
  
  // Edit Upcoming Maintenance Modal state
  const [editingUpcomingMaintenance, setEditingUpcomingMaintenance] = useState(null);
  const [editUpcomingMaintenanceForm, setEditUpcomingMaintenanceForm] = useState({
    title: '',
    description: '',
    due_after_matches: '',
    type: 'maintenance',
    repeat: false,
    repeat_every_matches: ''
  });

  useEffect(() => {
    fetchSystems();
    fetchSubsystems();
    fetchParts();
    if (activeTab === 'dashboard') {
      fetchMaintenanceItems();
    }
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
      setMaintenanceItems(data || []);
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
        setMaintenanceItems(itemsWithSystems);
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError);
        setMaintenanceItems([]);
      }
    }
  };

  // Calculate filtered maintenance items based on matches ahead
  const getFilteredMaintenanceItems = () => {
    if (!maintenanceItems || maintenanceItems.length === 0) return [];
    
    const runtimePerMatch = 2.5 / 60; // 2.5 minutes per match in hours
    const filteredInstances = [];
    
    maintenanceItems.forEach((item) => {
      const system = item.systems || systems.find(s => s.id === item.system_id);
      if (!system) return;
      
      const currentRuntimeHours = system.usage_time || 0;
      const currentRuntimeMinutes = currentRuntimeHours * 60;
      const maxAheadMinutes = matchesAhead * 2.5;
      const maxAheadRuntimeMinutes = currentRuntimeMinutes + maxAheadMinutes;
      
      // Extract target runtime and repeat info from description
      const desc = item.description || '';
      let initialTargetMinutes = currentRuntimeMinutes + 12.5; // Default to 5 matches ahead
      const runtimeMatch = desc.match(/target runtime: ([\d.]+) hours/);
      if (runtimeMatch) {
        initialTargetMinutes = parseFloat(runtimeMatch[1]) * 60;
      } else {
        const matchesMatch = desc.match(/after ([\d.]+) match/);
        if (matchesMatch) {
          const matches = parseFloat(matchesMatch[1]);
          initialTargetMinutes = currentRuntimeMinutes + (matches * 2.5);
        }
      }
      
      // Check if it repeats
      const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
      const repeatEveryMatches = repeatMatch ? parseFloat(repeatMatch[1]) : null;
      
      if (repeatEveryMatches) {
        // Show all instances within the matches ahead window, including overdue ones
        const repeatIntervalMinutes = repeatEveryMatches * 2.5;
        let instanceMinutes = initialTargetMinutes;
        let instanceNumber = 0;
        
        // If the first instance is overdue, calculate the first overdue instance directly
        if (initialTargetMinutes <= currentRuntimeMinutes) {
          // Calculate how many intervals have passed since the initial target
          const intervalsPassed = Math.floor((currentRuntimeMinutes - initialTargetMinutes) / repeatIntervalMinutes);
          // The most recent overdue instance is at intervalsPassed (if it's still overdue) or intervalsPassed-1
          let mostRecentOverdueNumber = intervalsPassed;
          let mostRecentOverdueMinutes = initialTargetMinutes + (mostRecentOverdueNumber * repeatIntervalMinutes);
          
          // If this instance is not overdue (it's in the future), go back one
          if (mostRecentOverdueMinutes > currentRuntimeMinutes) {
            mostRecentOverdueNumber--;
            mostRecentOverdueMinutes -= repeatIntervalMinutes;
          }
          
          // Limit to showing at most 20 overdue instances back from the most recent one
          // Start from the first overdue instance we want to show
          const maxOverdueToShow = 20;
          instanceNumber = Math.max(mostRecentOverdueNumber - (maxOverdueToShow - 1), 0);
          instanceMinutes = initialTargetMinutes + (instanceNumber * repeatIntervalMinutes);
        }
        
        // Now collect instances starting from here, including overdue and upcoming within window
        while (true) {
          const matchesRemaining = (instanceMinutes - currentRuntimeMinutes) / 2.5;
          const isDue = instanceMinutes <= currentRuntimeMinutes;
          
          // Include if overdue OR within the matches ahead window
          if (isDue || instanceMinutes <= maxAheadRuntimeMinutes) {
            filteredInstances.push({
              ...item,
              instanceMinutes,
              instanceNumber,
              matchesRemaining,
              isDue
            });
          }
          
          // Stop if we're past the window and not overdue
          if (instanceMinutes > maxAheadRuntimeMinutes && !isDue) {
            break;
          }
          
          instanceMinutes += repeatIntervalMinutes;
          instanceNumber++;
          
          // Safety limit to prevent too many iterations
          if (instanceNumber > 100) {
            break;
          }
        }
      } else {
        // Single instance - include if overdue OR within the matches ahead window
        const matchesRemaining = (initialTargetMinutes - currentRuntimeMinutes) / 2.5;
        const isDue = initialTargetMinutes <= currentRuntimeMinutes;
        
        if (isDue || initialTargetMinutes <= maxAheadRuntimeMinutes) {
          filteredInstances.push({
            ...item,
            instanceMinutes: initialTargetMinutes,
            instanceNumber: 0,
            matchesRemaining,
            isDue
          });
        }
      }
    });
    
    // Sort by instanceMinutes (when maintenance is due)
    return filteredInstances.sort((a, b) => a.instanceMinutes - b.instanceMinutes);
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
      // Convert minutes to hours for database storage
      const usageTimeMinutes = parseFloat(newSystem.usage_time) || 0;
      const usageTimeHours = usageTimeMinutes / 60;
      
      const { error } = await supabase
        .from('systems')
        .insert([{
          name: newSystem.name.trim(),
          description: newSystem.description.trim() || null,
          usage_time: usageTimeHours,
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
    if (!wpilogFile) {
      showAlert('Please select a wpilog file');
      return;
    }

    if (!isSupabaseConfigured) {
      showAlert('Supabase is not configured');
      return;
    }

    setUploadingWpilog(true);

    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await wpilogFile.arrayBuffer();
      
      // Parse the log file to get elapsed time in minutes, then convert to hours
      const { parseWpilogFileRobust } = await import('../utils/logParser');
      const elapsedMinutes = await parseWpilogFileRobust(arrayBuffer);
      const timeValue = elapsedMinutes / 60; // Convert minutes to hours

      // Fetch all systems
      const { data: allSystems, error: fetchError } = await supabase
        .from('systems')
        .select('id, usage_time');

      if (fetchError) throw fetchError;

      if (!allSystems || allSystems.length === 0) {
        showAlert('No systems found. Create systems first.');
        return;
      }

      // Insert wpilog record for all systems (or we could store it once)
      // For now, we'll just update usage times
      
      // Update all systems' usage_time by adding elapsed time to each
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

      setWpilogFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      fetchSystems();
      showAlert(`Success! Added ${timeValue.toFixed(2)} hours to all ${allSystems.length} system(s).`);
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

      setSelectedSystemForFailure('');
      setFailureComponents('');
      setFailureComment('');
      setSelectedPartsForFailure([]);
      setPartsSearchTerm('');
      setShowPartsDropdown(false);
      fetchSystems(); // Refresh systems to show updated time_since_last_maintenance
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
      // Fetch failures
      const { data: failuresData, error: failuresError } = await supabase
        .from('failures')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false });

      if (failuresError) throw failuresError;

      // Fetch completed maintenance items
      const { data: completedMaintenanceData, error: completedMaintenanceError } = await supabase
        .from('maintenance_reviews')
        .select('*')
        .eq('system_id', systemId)
        .eq('completed', true)
        .order('completed_at', { ascending: false });

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

    if (!newMaintenance.due_after_matches || parseFloat(newMaintenance.due_after_matches) <= 0) {
      showAlert('Please enter a valid number of matches');
      return;
    }

    try {
      // Calculate runtime: 1 FRC match = 2:30 = 150 seconds = 2.5 minutes = 0.04167 hours
      const matches = parseFloat(newMaintenance.due_after_matches);
      const runtimePerMatch = 2.5 / 60; // 2.5 minutes in hours
      const targetRuntime = (selectedSystemDetails.usage_time || 0) + (matches * runtimePerMatch);
      
      // Store matches info and repeat info in description
      let matchesInfo = `Scheduled after ${matches} match${matches !== 1 ? 'es' : ''} (target runtime: ${targetRuntime.toFixed(2)} hours)`;
      
      if (newMaintenance.repeat && newMaintenance.repeat_every_matches) {
        const repeatMatches = parseFloat(newMaintenance.repeat_every_matches);
        matchesInfo += ` | Repeats every ${repeatMatches} match${repeatMatches !== 1 ? 'es' : ''}`;
      }
      
      const fullDescription = newMaintenance.description.trim() 
        ? `${newMaintenance.description.trim()}\n\n${matchesInfo}`
        : matchesInfo;

      // Calculate a due date far in the future (we'll track by runtime instead)
      // Set due_date to null since we're tracking by runtime
      const { error } = await supabase
        .from('maintenance_reviews')
        .insert([{
          system_id: selectedSystemDetails.id,
          type: newMaintenance.type,
          title: newMaintenance.title.trim(),
          description: fullDescription,
          due_date: null, // We track by runtime, not date
          completed: false
        }]);

      if (error) throw error;

      setNewMaintenance({ title: '', description: '', due_after_matches: '', type: 'maintenance', repeat: true, repeat_every_matches: '' });
      fetchMaintenanceItems(); // Refresh the upcoming maintenance list
      if (selectedSystemDetails) {
        await fetchSystemFailures(selectedSystemDetails.id); // Refresh graph data
      }
      const repeatMsg = newMaintenance.repeat && newMaintenance.repeat_every_matches 
        ? ` Repeats every ${newMaintenance.repeat_every_matches} match${parseFloat(newMaintenance.repeat_every_matches) !== 1 ? 'es' : ''}.`
        : '';
      showAlert(`Maintenance scheduled successfully. Due after ${matches} match${matches !== 1 ? 'es' : ''} (${(matches * runtimePerMatch).toFixed(2)} hours of runtime).${repeatMsg}`);
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      showAlert('Error scheduling maintenance: ' + error.message);
    }
  };

  // Prepare graph data for scatter plot (time in minutes vs events)
  const getGraphData = () => {
    const events = [];
    const currentRuntime = (selectedSystemDetails?.usage_time || 0) * 60; // Convert to minutes
    
    // Add failures (red dots)
    // Note: We'll estimate runtime at time of failure based on chronological order
    // In a production system, you'd want to store actual runtime at event time
    if (systemFailures && systemFailures.length > 0) {
      systemFailures.forEach((failure, index) => {
        // Estimate runtime: distribute failures across current runtime
        // This is an approximation - ideally you'd store runtime at failure time
        const estimatedMinutes = (index / Math.max(systemFailures.length - 1, 1)) * currentRuntime;
        
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
    if (systemCompletedMaintenance && systemCompletedMaintenance.length > 0) {
      systemCompletedMaintenance.forEach((maintenance, index) => {
        // Estimate runtime similarly
        const totalEvents = systemFailures.length + systemCompletedMaintenance.length;
        const eventIndex = systemFailures.length + index;
        const estimatedMinutes = totalEvents > 1 
          ? (eventIndex / (totalEvents - 1)) * currentRuntime 
          : currentRuntime * 0.5;
        
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
  
  // Open edit upcoming maintenance modal
  const openEditUpcomingMaintenance = (maintenance) => {
    const desc = maintenance.description || '';
    const originalDesc = desc.split('\n\n')[0] || '';
    
    // Extract matches info from description
    let dueAfterMatches = '';
    let repeat = false;
    let repeatEveryMatches = '';
    
    const matchesMatch = desc.match(/after ([\d.]+) match/);
    if (matchesMatch) {
      dueAfterMatches = matchesMatch[1];
    }
    
    const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
    if (repeatMatch) {
      repeat = true;
      repeatEveryMatches = repeatMatch[1];
    }
    
    setEditingUpcomingMaintenance(maintenance);
    setEditUpcomingMaintenanceForm({
      title: maintenance.title || '',
      description: originalDesc,
      due_after_matches: dueAfterMatches,
      type: maintenance.type || 'maintenance',
      repeat: repeat,
      repeat_every_matches: repeatEveryMatches
    });
  };
  
  // Handle update upcoming maintenance
  const handleUpdateUpcomingMaintenance = async () => {
    if (!editingUpcomingMaintenance) return;
    
    if (!editUpcomingMaintenanceForm.title.trim()) {
      showAlert('Please enter a maintenance title');
      return;
    }
    
    if (!editUpcomingMaintenanceForm.due_after_matches || parseFloat(editUpcomingMaintenanceForm.due_after_matches) <= 0) {
      showAlert('Please enter a valid number of matches');
      return;
    }
    
    try {
      const system = selectedSystemDetails || systems.find(s => s.id === editingUpcomingMaintenance.system_id);
      if (!system) {
        showAlert('System not found');
        return;
      }
      
      // Calculate new target runtime
      const matches = parseFloat(editUpcomingMaintenanceForm.due_after_matches);
      const runtimePerMatch = 2.5 / 60; // 2.5 minutes in hours
      const targetRuntime = (system.usage_time || 0) + (matches * runtimePerMatch);
      
      // Build description with matches info
      let matchesInfo = `Scheduled after ${matches} match${matches !== 1 ? 'es' : ''} (target runtime: ${targetRuntime.toFixed(2)} hours)`;
      
      if (editUpcomingMaintenanceForm.repeat && editUpcomingMaintenanceForm.repeat_every_matches) {
        const repeatMatches = parseFloat(editUpcomingMaintenanceForm.repeat_every_matches);
        matchesInfo += ` | Repeats every ${repeatMatches} match${repeatMatches !== 1 ? 'es' : ''}`;
      }
      
      const fullDescription = editUpcomingMaintenanceForm.description.trim() 
        ? `${editUpcomingMaintenanceForm.description.trim()}\n\n${matchesInfo}`
        : matchesInfo;
      
      const { error } = await supabase
        .from('maintenance_reviews')
        .update({
          title: editUpcomingMaintenanceForm.title.trim(),
          description: fullDescription,
          type: editUpcomingMaintenanceForm.type
        })
        .eq('id', editingUpcomingMaintenance.id);
      
      if (error) throw error;
      
      // Refresh data
      fetchMaintenanceItems();
      if (selectedSystemDetails && selectedSystemDetails.id === editingUpcomingMaintenance.system_id) {
        await fetchSystemFailures(editingUpcomingMaintenance.system_id);
      }
      
      setEditingUpcomingMaintenance(null);
      setEditUpcomingMaintenanceForm({
        title: '',
        description: '',
        due_after_matches: '',
        type: 'maintenance',
        repeat: false,
        repeat_every_matches: ''
      });
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
    setShowConfirmModal(true);
  };

  // Mark maintenance as completed and add to incidents graph
  const handleCompleteMaintenance = async () => {
    if (!maintenanceToComplete) return;

    const item = maintenanceToComplete;
    setShowConfirmModal(false);

    try {
      // Check if this is a repeating maintenance
      const desc = item.description || '';
      const repeatMatch = desc.match(/Repeats every ([\d.]+) match/);
      const repeatEveryMatches = repeatMatch ? parseFloat(repeatMatch[1]) : null;
      
      // If it's repeating, create a new maintenance record for the next instance
      if (repeatEveryMatches) {
        // Get the system to calculate the new target runtime
        const system = item.systems || systems.find(s => s.id === item.system_id);
        if (system) {
          const currentRuntime = system.usage_time || 0;
          const runtimePerMatch = 2.5 / 60; // 2.5 minutes in hours
          
          // Calculate the next instance target runtime
          // The next instance should be scheduled after the repeat interval from now
          const nextTargetRuntime = currentRuntime + (repeatEveryMatches * runtimePerMatch);
          
          // Extract the original description (without the matches info)
          const originalDesc = desc.split('\n\n')[0] || item.title;
          
          // Create new matches info for the next instance
          const matchesInfo = `Scheduled after ${repeatEveryMatches} match${repeatEveryMatches !== 1 ? 'es' : ''} (target runtime: ${nextTargetRuntime.toFixed(2)} hours) | Repeats every ${repeatEveryMatches} match${repeatEveryMatches !== 1 ? 'es' : ''}`;
          const fullDescription = originalDesc 
            ? `${originalDesc}\n\n${matchesInfo}`
            : matchesInfo;
          
          // Create the next instance
          const { error: nextInstanceError } = await supabase
            .from('maintenance_reviews')
            .insert([{
              system_id: item.system_id,
              type: item.type,
              title: item.title,
              description: fullDescription,
              due_date: null,
              completed: false
            }]);
          
          if (nextInstanceError) throw nextInstanceError;
        }
      }
      
      // Update maintenance item as completed
      const { error: updateError } = await supabase
        .from('maintenance_reviews')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Create a failure entry for the incidents graph
      const { error: failureError } = await supabase
        .from('failures')
        .insert([{
          system_id: item.system_id,
          components_needing_replacement: [],
          comment: `Completed maintenance: ${item.title}${item.description ? '\n\n' + item.description : ''}`
        }]);

      if (failureError) throw failureError;

      // Refresh maintenance items and system failures if details modal is open
      fetchMaintenanceItems();
      if (selectedSystemDetails && selectedSystemDetails.id === item.system_id) {
        await fetchSystemFailures(item.system_id);
      }

      setMaintenanceToComplete(null);
      const repeatMsg = repeatEveryMatches 
        ? ` Next instance scheduled for ${repeatEveryMatches} match${repeatEveryMatches !== 1 ? 'es' : ''} from now.`
        : '';
      showAlert('Maintenance marked as completed and added to incidents graph.' + repeatMsg);
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
                <h3 style={{ margin: 0 }}>Upcoming Maintenance/Predicted Failures</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Matches ahead:</label>
                  <input
                    type="number"
                    value={matchesAhead}
                    onChange={(e) => setMatchesAhead(Math.max(1, parseInt(e.target.value) || 10))}
                    min="1"
                    step="1"
                    style={{ width: '60px', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div className="maintenance-list">
                {(() => {
                  const filteredItems = getFilteredMaintenanceItems();
                  return filteredItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <p>No upcoming maintenance or review items within the next {matchesAhead} matches</p>
                    </div>
                  ) : (
                    <div className="maintenance-order-book">
                      {filteredItems.map((item, index) => {
                        const isDue = item.isDue;
                        const matchesRemaining = isDue ? Math.abs(item.matchesRemaining) : Math.max(0, item.matchesRemaining);
                        return (
                          <div key={`${item.id}-${item.instanceNumber}-${index}`} className="maintenance-item" style={isDue ? { borderLeft: '4px solid #dc2626' } : {}}>
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
                              <span className="maintenance-type">{item.type}</span>
                              <span className="maintenance-system">
                                {item.systems?.name || systems.find(s => s.id === item.system_id)?.name || 'Unknown System'}
                              </span>
                            </div>
                            <div className="maintenance-item-title">{item.title}</div>
                            {item.description && (
                              <div className="maintenance-item-description">
                                {item.description.split('\n\n')[0]}
                                {item.instanceNumber > 0 && (
                                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                    Instance #{item.instanceNumber + 1}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="maintenance-item-due" style={{ color: isDue ? '#dc2626' : '#f59e0b', marginTop: '0.5rem' }}>
                              {isDue ? (
                                <span>⚠️ Due now ({matchesRemaining.toFixed(1)} matches overdue)</span>
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
          </div>

          {/* Right Side - Two Smaller Boxes */}
          <div className="dashboard-right">
            {/* Wpilog Upload Box */}
            <div className="dashboard-box">
              <h3>Upload Wpilog</h3>
              <div className="form-group">
                <label>Wpilog File</label>
                <input
                  type="file"
                  accept=".wpilog"
                  onChange={(e) => setWpilogFile(e.target.files[0])}
                  disabled={uploadingWpilog}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
                {wpilogFile && (
                  <p style={{ margin: '0.5rem 0', color: '#2563eb', fontSize: '0.9rem' }}>
                    Selected: {wpilogFile.name}
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleWpilogUpload}
                disabled={uploadingWpilog || !wpilogFile}
                style={{ width: '100%' }}
              >
                {uploadingWpilog ? 'Processing...' : 'Upload & Process Log'}
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
                      <div className="system-usage" style={{ marginTop: '1rem' }}>
                        <label>Time Since Last Maintenance (hours):</label>
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
                      <div className="system-usage" style={{ marginTop: '1rem' }}>
                        <label>Time Since Last Maintenance (hours):</label>
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
                  value={((newSystem.usage_time || 0) * 60).toFixed(1)}
                  onChange={(e) => setNewSystem({ ...newSystem, usage_time: (parseFloat(e.target.value) || 0) / 60 })}
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

      {/* Confirmation Modal for Completing Maintenance */}
      {showConfirmModal && maintenanceToComplete && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Completion</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Mark <strong>"{maintenanceToComplete.title}"</strong> as completed?
              </p>
              <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.6' }}>
                This will mark the maintenance as completed and add it to the incidents graph for the system.
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

      {/* Edit Upcoming Maintenance Modal */}
      {editingUpcomingMaintenance && (
        <div className="modal-overlay" onClick={() => setEditingUpcomingMaintenance(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Maintenance</h3>
              <button className="modal-close" onClick={() => setEditingUpcomingMaintenance(null)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Maintenance Type</label>
                <select
                  value={editUpcomingMaintenanceForm.type}
                  onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, type: e.target.value })}
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
                  value={editUpcomingMaintenanceForm.title}
                  onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editUpcomingMaintenanceForm.description}
                  onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, description: e.target.value })}
                  rows={3}
                  placeholder="Additional details..."
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label>Due After (Matches) *</label>
                <input
                  type="number"
                  value={editUpcomingMaintenanceForm.due_after_matches}
                  onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, due_after_matches: e.target.value })}
                  placeholder="e.g., 10"
                  min="1"
                  step="1"
                  required
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginBottom: '1rem' }}>
                  1 FRC match = 2:30 (2.5 minutes) of runtime
                  {editUpcomingMaintenanceForm.due_after_matches && parseFloat(editUpcomingMaintenanceForm.due_after_matches) > 0 && (
                    <span style={{ display: 'block', marginTop: '0.25rem' }}>
                      = {(parseFloat(editUpcomingMaintenanceForm.due_after_matches) * 2.5 / 60).toFixed(2)} hours of additional runtime
                    </span>
                  )}
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editUpcomingMaintenanceForm.repeat}
                    onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, repeat: e.target.checked, repeat_every_matches: e.target.checked ? editUpcomingMaintenanceForm.repeat_every_matches : '' })}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  <span>Repeat this maintenance</span>
                </label>
                {editUpcomingMaintenanceForm.repeat && (
                  <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                    <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Repeat every (matches):</label>
                    <input
                      type="number"
                      value={editUpcomingMaintenanceForm.repeat_every_matches}
                      onChange={(e) => setEditUpcomingMaintenanceForm({ ...editUpcomingMaintenanceForm, repeat_every_matches: e.target.value })}
                      placeholder="e.g., 20"
                      min="1"
                      step="1"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Maintenance will be scheduled again every {editUpcomingMaintenanceForm.repeat_every_matches || 'X'} match{parseFloat(editUpcomingMaintenanceForm.repeat_every_matches) !== 1 ? 'es' : ''} after completion
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setEditingUpcomingMaintenance(null);
                    setEditUpcomingMaintenanceForm({
                      title: '',
                      description: '',
                      due_after_matches: '',
                      type: 'maintenance',
                      repeat: false,
                      repeat_every_matches: ''
                    });
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleUpdateUpcomingMaintenance} className="btn btn-primary">
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
                    <strong>Current Runtime:</strong> {((selectedSystemDetails.usage_time || 0) * 60).toFixed(1)} minutes 
                    {selectedSystemDetails.usage_time > 0 && (
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                        ({Math.round((selectedSystemDetails.usage_time || 0) * 60 / 2.5)} matches)
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
                      currentRuntimeMinutes={(selectedSystemDetails.usage_time || 0) * 60}
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
                                  openEditUpcomingMaintenance(maintenance);
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              >
                                Edit
                              </button>
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
                    <label>Due After (Matches) *</label>
                    <input
                      type="number"
                      value={newMaintenance.due_after_matches}
                      onChange={(e) => setNewMaintenance({ ...newMaintenance, due_after_matches: e.target.value })}
                      placeholder="e.g., 10"
                      min="1"
                      step="1"
                      required
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginBottom: '1rem' }}>
                      1 FRC match = 2:30 (2.5 minutes) of runtime
                      {newMaintenance.due_after_matches && parseFloat(newMaintenance.due_after_matches) > 0 && (
                        <span style={{ display: 'block', marginTop: '0.25rem' }}>
                          = {(parseFloat(newMaintenance.due_after_matches) * 2.5 / 60).toFixed(2)} hours of additional runtime
                        </span>
                      )}
                    </small>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newMaintenance.repeat}
                        onChange={(e) => setNewMaintenance({ ...newMaintenance, repeat: e.target.checked, repeat_every_matches: e.target.checked ? newMaintenance.repeat_every_matches : '' })}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      <span>Repeat this maintenance</span>
                    </label>
                    {newMaintenance.repeat && (
                      <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                        <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Repeat every (matches):</label>
                        <input
                          type="number"
                          value={newMaintenance.repeat_every_matches}
                          onChange={(e) => setNewMaintenance({ ...newMaintenance, repeat_every_matches: e.target.value })}
                          placeholder="e.g., 20"
                          min="1"
                          step="1"
                          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                        />
                        <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          Maintenance will be scheduled again every {newMaintenance.repeat_every_matches || 'X'} match{parseFloat(newMaintenance.repeat_every_matches) !== 1 ? 'es' : ''} after completion
                        </small>
                      </div>
                    )}
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

  if (!data || data.length === 0) {
    return <div className="graph-empty">No events recorded yet</div>;
  }

  const graphHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = 800;
  const plotHeight = graphHeight - padding.top - padding.bottom;
  const plotWidth = graphWidth - padding.left - padding.right;

  // Calculate time range: from 0 to current runtime + 10 matches (25 minutes ahead)
  const maxMinutes = Math.max(
    currentRuntimeMinutes + 25, // 10 matches ahead
    ...data.map(d => d.minutes),
    10 // minimum range
  );
  const minMinutes = 0;

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
  
  // Find the maximum number of simultaneous events
  const maxSimultaneousEvents = Math.max(
    ...Object.values(eventsByTime).map(events => events.length),
    1
  );
  
  // Y-axis: number of events at each time point (not cumulative)
  // Always display up to 5 events on the y-axis
  const yAxisMax = 5;
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

  // X-axis scale: minutes to pixels
  const xScale = (minutes) => {
    return padding.left + (minutes / maxMinutes) * plotWidth;
  };

  const currentRuntimeX = xScale(currentRuntimeMinutes);

  return (
    <div className="timeline-graph-container">
      <div className="timeline-graph-wrapper">
        <svg width={graphWidth} height={graphHeight} className="timeline-graph" style={{ overflow: 'visible' }}>
          {/* Vertical grid lines - show every 5 minutes or appropriate intervals */}
          {(() => {
            const numGridLines = Math.ceil(maxMinutes / 5);
            const gridLines = [];
            for (let i = 0; i <= numGridLines; i++) {
              const minutes = (maxMinutes / numGridLines) * i;
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
          {currentRuntimeMinutes > 0 && (
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
          {eventDataWithCount.map((event, index) => {
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
