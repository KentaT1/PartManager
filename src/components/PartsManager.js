import React, { useState, useEffect } from 'react';
import './PartsManager.css';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const STATUS_OPTIONS = {
  'ready-to-manufacture': { label: 'Ready to Manufacture', color: '#10b981', bgColor: '#d1fae5' },
  'ready-to-review': { label: 'Ready to Review', color: '#f59e0b', bgColor: '#fef3c7' },
  'reviewed': { label: 'Reviewed', color: '#2563eb', bgColor: '#dbeafe' },
  'manufactured': { label: 'Manufactured', color: '#6b7280', bgColor: '#f3f4f6' },
  'flagged': { label: 'Flagged', color: '#dc2626', bgColor: '#fee2e2' }
};

const COTS_STATUS_OPTIONS = {
  'not-bought': { label: 'Not Bought', color: '#dc2626', bgColor: '#fee2e2' },
  'bought': { label: 'Bought', color: '#f59e0b', bgColor: '#fef3c7' },
  'received': { label: 'Received', color: '#10b981', bgColor: '#d1fae5' },
  'flagged': { label: 'Flagged', color: '#dc2626', bgColor: '#fee2e2' }
};

// Helper function to check if a part number indicates COTS
const isCOTSPartNumber = (partNumber) => {
  if (!partNumber) return false;
  // Check for common COTS part number patterns: WCP-####, REV-####, am-####, etc.
  const cotsPatterns = /^(WCP|REV|am|VH|217|21|14|6498|6338|2934|6261|60645|4409|6793|94615|94328|94290|91355|91255|91253|91251|97763|97633|97526|96659|95462|90630)-\d+/i;
  return cotsPatterns.test(partNumber.trim());
};

// Helper function to detect vendor from part number
const detectVendorFromPartNumber = (partNumber) => {
  if (!partNumber) return 'Unknown';
  const partNum = partNumber.trim().toUpperCase();
  
  // WCP (West Coast Products) - starts with WCP-
  if (/^WCP-/.test(partNum)) return 'WCP';
  
  // REV Robotics - starts with REV-
  if (/^REV-/.test(partNum)) return 'REV Robotics';
  
  // AndyMark - starts with am-
  if (/^AM-/.test(partNum)) return 'AndyMark';
  
  // VEX Robotics - starts with 217-
  if (/^217-/.test(partNum)) return 'VEX Robotics';
  
  // McMaster-Carr - typically 5-7 digits, may have letter suffix (e.g., 97035K42, 94615A123)
  // Pattern: 5-7 digits optionally followed by 1-2 letters and more digits
  if (/^\d{5,7}([A-Z]\d+)?$/.test(partNum)) return 'McMaster-Carr';
  
  // Generic numeric patterns (could be various vendors)
  if (/^\d+$/.test(partNum)) return 'Other (Numeric)';
  
  return 'Other';
};

function PartsManager() {
  const [mainView, setMainView] = useState('parts'); // 'parts', 'manufacturing', or 'buylist'
  const [subsystems, setSubsystems] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [parts, setParts] = useState([]);
  const [manufacturingParts, setManufacturingParts] = useState([]);
  const [cotsParts, setCotsParts] = useState([]);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [buyListSearchQuery, setBuyListSearchQuery] = useState('');
  const [selectedCotsParts, setSelectedCotsParts] = useState([]);
  const [batchCotsStatus, setBatchCotsStatus] = useState('not-bought');
  const [showBatchCotsStatusModal, setShowBatchCotsStatusModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddSubsystemModal, setShowAddSubsystemModal] = useState(false);
  const [showDeleteSubsystemModal, setShowDeleteSubsystemModal] = useState(false);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showUpdatePartTypeModal, setShowUpdatePartTypeModal] = useState(false);
  const [showBatchUpdatePartTypeModal, setShowBatchUpdatePartTypeModal] = useState(false);
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null); // Part ID for which menu is open
  const [alertMessage, setAlertMessage] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [batchStatus, setBatchStatus] = useState('ready-to-manufacture');
  const [batchPartType, setBatchPartType] = useState(false); // false = not COTS, true = COTS
  const [partsSearchQuery, setPartsSearchQuery] = useState('');
  const [partsFlaggedFilter, setPartsFlaggedFilter] = useState('all'); // 'all', 'flagged', 'not-flagged'
  const [manufacturingSearchQuery, setManufacturingSearchQuery] = useState('');
  const [manufacturingSubsystemFilter, setManufacturingSubsystemFilter] = useState('all');
  const [manufacturingPartTypeFilter, setManufacturingPartTypeFilter] = useState('all');
  const [subsystemToDelete, setSubsystemToDelete] = useState(null);
  const [partToDelete, setPartToDelete] = useState(null);
  const [partToUpdateType, setPartToUpdateType] = useState(null);
  const [newSubsystemName, setNewSubsystemName] = useState('');
  const [showImportBOM, setShowImportBOM] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPartDetails, setSelectedPartDetails] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggingPart, setFlaggingPart] = useState(null);
  const [flagNote, setFlagNote] = useState('');
  const [showFlagNoteModal, setShowFlagNoteModal] = useState(false);
  const [viewingFlagNote, setViewingFlagNote] = useState(null);
  const [showQuickAddLinkModal, setShowQuickAddLinkModal] = useState(false);
  const [partToAddLink, setPartToAddLink] = useState(null);
  const [quickLinkValue, setQuickLinkValue] = useState('');
  const [newPart, setNewPart] = useState({
    name: '',
    onshape_link: '',
    status: 'ready-to-manufacture',
    drawn_by: '',
    reviewed_by: '',
    subsystem_id: null,
    is_cots: false,
    part_number: '',
    details: {}
  });

  // Fetch subsystems
  useEffect(() => {
    fetchSubsystems();
  }, []);

  // Fetch parts when active tab changes
  useEffect(() => {
    if (activeTab) {
      fetchParts(activeTab);
      setSelectedParts([]); // Clear selection when switching tabs
      setPartsSearchQuery(''); // Clear search when switching tabs
      closeActionMenu(); // Close any open action menus
    }
  }, [activeTab]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openActionMenu && !event.target.closest('.action-menu-wrapper')) {
        closeActionMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openActionMenu]);

  // Fetch manufacturing parts when manufacturing view is active
  useEffect(() => {
    if (mainView === 'manufacturing') {
      fetchManufacturingParts();
    }
  }, [mainView]);

  // Fetch COTS parts when buy list view is active
  useEffect(() => {
    if (mainView === 'buylist') {
      fetchCOTSParts();
    }
  }, [mainView]);

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

  const fetchManufacturingParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select(`
          *,
          subsystems (
            id,
            name
          )
        `)
        .eq('status', 'ready-to-manufacture')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManufacturingParts(data || []);
    } catch (error) {
      console.error('Error fetching manufacturing parts:', error);
      setManufacturingParts([]);
    }
  };

  const fetchCOTSParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select(`
          *,
          subsystems (
            id,
            name
          )
        `)
        .eq('is_cots', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCotsParts(data || []);
    } catch (error) {
      console.error('Error fetching COTS parts:', error);
      setCotsParts([]);
    }
  };

  const handleMarkAsBought = async (partId) => {
    try {
      const { error } = await supabase
        .from('parts')
        .update({ status: 'bought' })
        .eq('id', partId);

      if (error) throw error;
      fetchCOTSParts();
      // Also refresh parts in parts management view if activeTab exists
      if (activeTab) {
        fetchParts(activeTab);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('Error updating status: ' + error.message);
    }
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const closeAlert = () => {
    setShowAlertModal(false);
    setAlertMessage('');
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }
    
    if (!newPart.name.trim()) {
      showAlert('Please enter a part name');
      return;
    }

    if (!activeTab) {
      showAlert('Please select a subsystem first');
      return;
    }

    // Auto-detect COTS from part number if not explicitly set
    const partNumber = newPart.part_number?.trim() || '';
    const isCots = newPart.is_cots || isCOTSPartNumber(partNumber);
    
    // Set default status based on COTS
    const defaultStatus = isCots ? 'not-bought' : 'ready-to-manufacture';
    const status = newPart.status || defaultStatus;

    try {
      const { data, error } = await supabase
        .from('parts')
        .insert([
          {
            name: newPart.name,
            onshape_link: newPart.onshape_link,
            status: status,
            drawn_by: newPart.drawn_by,
            reviewed_by: newPart.reviewed_by,
            subsystem_id: activeTab,
            is_cots: isCots,
            details: {
              ...newPart.details,
              part_number: partNumber,
              material: newPart.details.material || '',
              weight: newPart.details.weight || '',
              vendor: newPart.details.vendor || '',
              part_quantity: newPart.details.part_quantity || '',
              order_quantity: newPart.details.order_quantity || '',
              order_date: newPart.details.order_date || ''
            }
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
        subsystem_id: null,
        is_cots: false,
        part_number: '',
        details: {}
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
      
      showAlert(errorMessage);
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
      if (mainView === 'manufacturing') {
        fetchManufacturingParts();
      }
      if (mainView === 'buylist') {
        fetchCOTSParts();
      }
    } catch (error) {
      console.error('Error updating part status:', error);
      showAlert('Error updating part status: ' + error.message);
    }
  };

  const openQuickAddLinkModal = (partId, partName, isCots = null, partLink = null) => {
    // Check both regular parts and COTS parts
    const part = parts.find(p => p.id === partId) || cotsParts.find(p => p.id === partId);
    // If isCots is explicitly passed, use it; otherwise check the part or default to false
    const partIsCots = isCots !== null ? isCots : (part?.is_cots || false);
    // Use provided link, or part's link, or empty string
    const linkValue = partLink !== null ? partLink : (part?.onshape_link || '');
    setPartToAddLink({ id: partId, name: partName, isCots: partIsCots });
    setQuickLinkValue(linkValue);
    setShowQuickAddLinkModal(true);
  };

  const closeQuickAddLinkModal = () => {
    setShowQuickAddLinkModal(false);
    setPartToAddLink(null);
    setQuickLinkValue('');
  };

  const handleQuickAddLink = async (e) => {
    e.preventDefault();
    
    if (!partToAddLink) return;
    
    const trimmedLink = quickLinkValue.trim();
    if (!trimmedLink) {
      showAlert('Link cannot be empty.');
      return;
    }

    try {
      const { error } = await supabase
        .from('parts')
        .update({ onshape_link: trimmedLink })
        .eq('id', partToAddLink.id);

      if (error) throw error;
      fetchParts(activeTab);
      if (mainView === 'manufacturing') {
        fetchManufacturingParts();
      }
      if (mainView === 'buylist') {
        fetchCOTSParts();
      }
      closeQuickAddLinkModal();
    } catch (error) {
      console.error('Error updating part link:', error);
      showAlert('Error updating part link: ' + error.message);
    }
  };

  const openFlagModal = (part) => {
    setFlaggingPart(part);
    setFlagNote('');
    setShowFlagModal(true);
  };

  const closeFlagModal = () => {
    setShowFlagModal(false);
    setFlaggingPart(null);
    setFlagNote('');
  };

  const handleFlagPart = async () => {
    if (!flaggingPart || !flagNote.trim()) {
      showAlert('Please enter a note for the flag');
      return;
    }

    try {
      const currentDetails = flaggingPart.details || {};
      const { error } = await supabase
        .from('parts')
        .update({ 
          status: 'flagged',
          details: {
            ...currentDetails,
            flag_note: flagNote.trim()
          }
        })
        .eq('id', flaggingPart.id);

      if (error) throw error;
      
      // Refresh the appropriate views
      if (mainView === 'manufacturing') {
        fetchManufacturingParts();
      } else if (mainView === 'buylist') {
        fetchCOTSParts();
      }
      if (activeTab) {
        fetchParts(activeTab);
      }
      
      closeFlagModal();
    } catch (error) {
      console.error('Error flagging part:', error);
      showAlert('Error flagging part: ' + error.message);
    }
  };

  const openFlagNoteModal = (part) => {
    const note = part.details?.flag_note || 'No note available';
    setViewingFlagNote(note);
    setShowFlagNoteModal(true);
  };

  const closeFlagNoteModal = () => {
    setShowFlagNoteModal(false);
    setViewingFlagNote(null);
  };

  const handleShowDetails = (part) => {
    // Ensure details is an object
    const partWithDetails = {
      ...part,
      details: part.details || {}
    };
    setSelectedPartDetails(partWithDetails);
    setShowDetailsModal(true);
  };

  const handleImportBOM = async (file) => {
    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }

    // Ensure subsystems are loaded
    if (subsystems.length === 0) {
      showAlert('Please create at least one subsystem before importing parts');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showAlert('CSV file appears to be empty or invalid');
        return;
      }

      // Skip header row (line 0), parse data starting from line 1
      const partsToImport = [];
      const subsystemsList = subsystems;
      
      // Simple CSV parser that handles quoted fields
      const parseCSVLine = (line) => {
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const nextChar = line[j + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              currentField += '"';
              j++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim());
        return fields;
      };
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const fields = parseCSVLine(line);

        if (fields.length < 2 || !fields[1]) continue; // Skip rows without name

        const name = (fields[1] || '').replace(/^"|"$/g, ''); // Remove surrounding quotes
        const partNumber = (fields[2] || '').replace(/^"|"$/g, '');
        const link = (fields[5] || '').replace(/^"|"$/g, '');
        const material = (fields[7] || '').replace(/^"|"$/g, '');
        const mass = (fields[8] || '').replace(/^"|"$/g, '');
        const vendor = (fields[9] || '').replace(/^"|"$/g, '');
        const partQuantity = (fields[10] || '').replace(/^"|"$/g, '');
        const orderQuantity = (fields[11] || '').replace(/^"|"$/g, '');
        const bought = (fields[12] || '').toUpperCase() === 'TRUE';
        const orderDate = (fields[13] || '').replace(/^"|"$/g, '');

        if (!name) continue;

        const isCots = isCOTSPartNumber(partNumber);
        const status = isCots 
          ? (bought ? (partNumber.includes('*InStock') ? 'received' : 'bought') : 'not-bought')
          : 'ready-to-manufacture';

        // Assign to random subsystem
        const randomSubsystem = subsystemsList[Math.floor(Math.random() * subsystemsList.length)].id;

        partsToImport.push({
          name: name,
          onshape_link: link,
          status: status,
          subsystem_id: randomSubsystem,
          is_cots: isCots,
          details: {
            part_number: partNumber,
            material: material,
            weight: mass,
            vendor: vendor,
            part_quantity: partQuantity,
            order_quantity: orderQuantity,
            order_date: orderDate,
            bought: bought
          }
        });
      }

      if (partsToImport.length === 0) {
        showAlert('No valid parts found in the CSV file');
        return;
      }

      // Insert parts in batches
      const batchSize = 50;
      for (let i = 0; i < partsToImport.length; i += batchSize) {
        const batch = partsToImport.slice(i, i + batchSize);
        const { error } = await supabase
          .from('parts')
          .insert(batch);

        if (error) throw error;
      }

      showAlert(`Successfully imported ${partsToImport.length} parts from BOM! Parts have been randomly assigned to subsystems.`);
      if (activeTab) {
        fetchParts(activeTab);
      }
      setShowImportBOM(false);
    } catch (error) {
      console.error('Error importing BOM:', error);
      showAlert('Error importing BOM: ' + error.message);
    }
  };

  const openDeletePartModal = (partId, partName) => {
    setPartToDelete({ id: partId, name: partName });
    setShowDeletePartModal(true);
  };

  const closeDeletePartModal = () => {
    setShowDeletePartModal(false);
    setPartToDelete(null);
  };

  const handleDeletePart = async () => {
    if (!partToDelete) return;

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partToDelete.id);

      if (error) throw error;
      fetchParts(activeTab);
      closeDeletePartModal();
    } catch (error) {
      console.error('Error deleting part:', error);
      showAlert('Error deleting part: ' + error.message);
    }
  };

  const handleSelectPart = (partId) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const handleSelectAll = () => {
    if (selectedParts.length === parts.length) {
      setSelectedParts([]);
    } else {
      setSelectedParts(parts.map(part => part.id));
    }
  };

  const handleSelectCotsPart = (partId) => {
    setSelectedCotsParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const handleSelectAllCots = () => {
    const filteredParts = vendorFilter === 'all' 
      ? cotsParts 
      : cotsParts.filter(p => {
          const partNum = p.details?.part_number || '';
          return detectVendorFromPartNumber(partNum) === vendorFilter;
        });
    
    if (selectedCotsParts.length === filteredParts.length) {
      setSelectedCotsParts([]);
    } else {
      setSelectedCotsParts(filteredParts.map(part => part.id));
    }
  };

  const handleBatchUpdateCotsStatus = async () => {
    if (selectedCotsParts.length === 0) return;

    try {
      const { error } = await supabase
        .from('parts')
        .update({ status: batchCotsStatus })
        .in('id', selectedCotsParts);

      if (error) throw error;
      
      fetchCOTSParts();
      setSelectedCotsParts([]);
      setShowBatchCotsStatusModal(false);
    } catch (error) {
      console.error('Error updating batch COTS status:', error);
      showAlert('Error updating status: ' + error.message);
    }
  };

  const handleBatchUpdateStatus = async () => {
    if (selectedParts.length === 0) return;

    try {
      const { error } = await supabase
        .from('parts')
        .update({ status: batchStatus })
        .in('id', selectedParts);

      if (error) throw error;
      
      fetchParts(activeTab);
      setSelectedParts([]);
      setShowBatchStatusModal(false);
    } catch (error) {
      console.error('Error updating batch status:', error);
      showAlert('Error updating status: ' + error.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedParts.length === 0) return;

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .in('id', selectedParts);

      if (error) throw error;
      
      fetchParts(activeTab);
      setSelectedParts([]);
      setShowBatchDeleteModal(false);
    } catch (error) {
      console.error('Error deleting parts:', error);
      showAlert('Error deleting parts: ' + error.message);
    }
  };

  const handleUpdatePartType = async (partId, isCots) => {
    try {
      // Get current part to determine status change
      const part = parts.find(p => p.id === partId);
      let newStatus = part?.status;

      // If changing to/from COTS, adjust status
      if (isCots && !part?.is_cots) {
        // Changing to COTS: set to not-bought
        newStatus = 'not-bought';
      } else if (!isCots && part?.is_cots) {
        // Changing from COTS: set to ready-to-manufacture
        newStatus = 'ready-to-manufacture';
      }

      const { error } = await supabase
        .from('parts')
        .update({ 
          is_cots: isCots,
          status: newStatus
        })
        .eq('id', partId);

      if (error) throw error;
      fetchParts(activeTab);
      setShowUpdatePartTypeModal(false);
      setPartToUpdateType(null);
    } catch (error) {
      console.error('Error updating part type:', error);
      showAlert('Error updating part type: ' + error.message);
    }
  };

  const handleBatchUpdatePartType = async () => {
    if (selectedParts.length === 0) return;

    try {
      // Get all selected parts to determine status changes
      const selectedPartsData = parts.filter(p => selectedParts.includes(p.id));
      
      // Update each part with appropriate status
      const updatePromises = selectedPartsData.map(part => {
        let newStatus = part.status;
        if (batchPartType && !part.is_cots) {
          // Changing to COTS: set to not-bought
          newStatus = 'not-bought';
        } else if (!batchPartType && part.is_cots) {
          // Changing from COTS: set to ready-to-manufacture
          newStatus = 'ready-to-manufacture';
        }

        return supabase
          .from('parts')
          .update({ 
            is_cots: batchPartType,
            status: newStatus
          })
          .eq('id', part.id);
      });

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error.message || 'Error updating parts');
      }
      
      fetchParts(activeTab);
      setSelectedParts([]);
      setShowBatchUpdatePartTypeModal(false);
    } catch (error) {
      console.error('Error updating part types:', error);
      showAlert('Error updating part types: ' + error.message);
    }
  };

  const openActionMenuForPart = (partId, e) => {
    e.stopPropagation();
    setOpenActionMenu(openActionMenu === partId ? null : partId);
  };

  const closeActionMenu = () => {
    setOpenActionMenu(null);
  };

  const handleActionMenuClick = (partId, action) => {
    closeActionMenu();
    if (action === 'delete') {
      const part = parts.find(p => p.id === partId);
      openDeletePartModal(partId, part?.name || 'Unknown');
    } else if (action === 'updateType') {
      const part = parts.find(p => p.id === partId);
      setPartToUpdateType(part);
      setShowUpdatePartTypeModal(true);
    } else if (action === 'edit') {
      const part = parts.find(p => p.id === partId);
      if (part) {
        setEditingPart({
          id: part.id,
          name: part.name || '',
          onshape_link: part.onshape_link || '',
          status: part.status || 'ready-to-manufacture',
          drawn_by: part.drawn_by || '',
          reviewed_by: part.reviewed_by || '',
          is_cots: part.is_cots || false,
          part_number: part.details?.part_number || '',
          details: {
            part_number: part.details?.part_number || '',
            material: part.details?.material || '',
            weight: part.details?.weight || '',
            vendor: part.details?.vendor || '',
            part_quantity: part.details?.part_quantity || '',
            order_quantity: part.details?.order_quantity || '',
            order_date: part.details?.order_date || ''
          }
        });
        setShowEditPartModal(true);
      }
    }
  };

  const closeEditPartModal = () => {
    setShowEditPartModal(false);
    setEditingPart(null);
  };

  const handleEditPart = async (e) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }
    
    if (!editingPart || !editingPart.name.trim()) {
      showAlert('Please enter a part name');
      return;
    }

    const partNumber = editingPart.part_number?.trim() || '';
    const isCots = editingPart.is_cots || isCOTSPartNumber(partNumber);
    
    // Set default status based on COTS if status is not set
    const defaultStatus = isCots ? 'not-bought' : 'ready-to-manufacture';
    const status = editingPart.status || defaultStatus;

    try {
      const { error } = await supabase
        .from('parts')
        .update({
          name: editingPart.name,
          onshape_link: editingPart.onshape_link,
          status: status,
          drawn_by: editingPart.drawn_by,
          reviewed_by: editingPart.reviewed_by,
          is_cots: isCots,
          details: {
            ...editingPart.details,
            part_number: partNumber,
            material: editingPart.details.material || '',
            weight: editingPart.details.weight || '',
            vendor: editingPart.details.vendor || '',
            part_quantity: editingPart.details.part_quantity || '',
            order_quantity: editingPart.details.order_quantity || '',
            order_date: editingPart.details.order_date || ''
          }
        })
        .eq('id', editingPart.id);

      if (error) {
        throw new Error(error.message || 'Database error. Make sure you have run the SQL schema in Supabase.');
      }

      // Refresh parts list
      fetchParts(activeTab);
      if (mainView === 'manufacturing') {
        fetchManufacturingParts();
      }
      if (mainView === 'buylist') {
        fetchCOTSParts();
      }
      
      closeEditPartModal();
    } catch (error) {
      console.error('Error editing part:', error);
      let errorMessage = 'Error editing part: ';
      
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

  const handleAddSubsystem = async (e) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      return;
    }
    
    if (!newSubsystemName.trim()) {
      showAlert('Please enter a subsystem name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subsystems')
        .insert([{ name: newSubsystemName.trim() }])
        .select();

      if (error) throw error;
      
      // Refresh subsystems list
      fetchSubsystems();
      
      // Reset form and close modal
      setNewSubsystemName('');
      setShowAddSubsystemModal(false);
    } catch (error) {
      console.error('Error adding subsystem:', error);
      let errorMessage = 'Error adding subsystem: ';
      
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

  const openAddSubsystemModal = () => {
    setNewSubsystemName('');
    setShowAddSubsystemModal(true);
  };

  const closeAddSubsystemModal = () => {
    setShowAddSubsystemModal(false);
    setNewSubsystemName('');
  };

  const openDeleteSubsystemModal = (subsystemId, subsystemName, e) => {
    e.stopPropagation(); // Prevent tab switch when clicking delete
    setSubsystemToDelete({ id: subsystemId, name: subsystemName });
    setShowDeleteSubsystemModal(true);
  };

  const closeDeleteSubsystemModal = () => {
    setShowDeleteSubsystemModal(false);
    setSubsystemToDelete(null);
  };

  const handleDeleteSubsystem = async () => {
    if (!subsystemToDelete) return;

    if (!isSupabaseConfigured) {
      showAlert('⚠️ Supabase is not configured!\n\nPlease:\n1. Create a .env.local file\n2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n3. Restart the development server\n\nSee README.md for setup instructions.');
      closeDeleteSubsystemModal();
      return;
    }

    try {
      // Check if subsystem has parts
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('id')
        .eq('subsystem_id', subsystemToDelete.id)
        .limit(1);

      if (partsError) throw partsError;

      if (partsData && partsData.length > 0) {
        showAlert(`Cannot delete "${subsystemToDelete.name}" because it contains parts. Please delete or move all parts first.`);
        closeDeleteSubsystemModal();
        return;
      }

      // Delete the subsystem
      const { error } = await supabase
        .from('subsystems')
        .delete()
        .eq('id', subsystemToDelete.id);

      if (error) throw error;

      // If the deleted subsystem was active, switch to another one
      if (activeTab === subsystemToDelete.id) {
        const remainingSubsystems = subsystems.filter(s => s.id !== subsystemToDelete.id);
        if (remainingSubsystems.length > 0) {
          setActiveTab(remainingSubsystems[0].id);
        } else {
          setActiveTab(null);
          setParts([]);
        }
      }

      // Refresh subsystems list
      fetchSubsystems();
      closeDeleteSubsystemModal();
    } catch (error) {
      console.error('Error deleting subsystem:', error);
      let errorMessage = 'Error deleting subsystem: ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Cannot connect to Supabase. Check your internet connection and Supabase credentials.';
      } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        errorMessage += 'This subsystem cannot be deleted because it contains parts. Please delete or move all parts first.';
      } else {
        errorMessage += error.message;
      }
      
      showAlert(errorMessage);
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
      
      {/* Main View Tabs */}
      <div className="main-view-tabs">
        <button
          className={`main-view-tab ${mainView === 'parts' ? 'active' : ''}`}
          onClick={() => setMainView('parts')}
        >
          Parts Management
        </button>
        <button
          className={`main-view-tab ${mainView === 'manufacturing' ? 'active' : ''}`}
          onClick={() => setMainView('manufacturing')}
        >
          Manufacturing Dashboard
        </button>
        <button
          className={`main-view-tab ${mainView === 'buylist' ? 'active' : ''}`}
          onClick={() => setMainView('buylist')}
        >
          Buy List
        </button>
      </div>

      {/* Parts Management View */}
      {mainView === 'parts' && (
        <div>
      {/* Add Subsystem Modal */}
      {showAddSubsystemModal && (
        <div className="modal-overlay" onClick={closeAddSubsystemModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Subsystem</h3>
              <button className="modal-close" onClick={closeAddSubsystemModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleAddSubsystem} className="modal-form">
              <div className="form-group">
                <label>Subsystem Name *</label>
                <input
                  type="text"
                  value={newSubsystemName}
                  onChange={(e) => setNewSubsystemName(e.target.value)}
                  placeholder="e.g., Drivetrain, Intake, Shooter"
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeAddSubsystemModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Subsystem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subsystem Modal */}
      {showDeleteSubsystemModal && subsystemToDelete && (
        <div className="modal-overlay" onClick={closeDeleteSubsystemModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Subsystem</h3>
              <button className="modal-close" onClick={closeDeleteSubsystemModal}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p className="delete-warning">
                Are you sure you want to delete <strong>"{subsystemToDelete.name}"</strong>?
              </p>
              <p className="delete-note">
                This action cannot be undone. If this subsystem contains parts, you'll need to delete or move them first.
              </p>
              <div className="modal-actions">
                <button type="button" onClick={closeDeleteSubsystemModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteSubsystem} className="btn btn-danger">
                  Delete Subsystem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Part Modal */}
      {showDeletePartModal && partToDelete && (
        <div className="modal-overlay" onClick={closeDeletePartModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Part</h3>
              <button className="modal-close" onClick={closeDeletePartModal}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p className="delete-warning">
                Are you sure you want to delete <strong>"{partToDelete.name}"</strong>?
              </p>
              <p className="delete-note">
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button type="button" onClick={closeDeletePartModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleDeletePart} className="btn btn-danger">
                  Delete Part
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={closeAlert}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Alert</h3>
              <button className="modal-close" onClick={closeAlert}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p className="alert-message" style={{ whiteSpace: 'pre-line' }}>
                {alertMessage}
              </p>
              <div className="modal-actions">
                <button type="button" onClick={closeAlert} className="btn btn-primary">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Status Modal */}
      {showBatchStatusModal && (
        <div className="modal-overlay" onClick={() => setShowBatchStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status for {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}</h3>
              <button className="modal-close" onClick={() => setShowBatchStatusModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>New Status *</label>
                <select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  style={{
                    backgroundColor: (batchStatus in COTS_STATUS_OPTIONS ? COTS_STATUS_OPTIONS : STATUS_OPTIONS)[batchStatus]?.bgColor || '#ffffff',
                    color: (batchStatus in COTS_STATUS_OPTIONS ? COTS_STATUS_OPTIONS : STATUS_OPTIONS)[batchStatus]?.color || '#1a1a1a',
                    borderColor: (batchStatus in COTS_STATUS_OPTIONS ? COTS_STATUS_OPTIONS : STATUS_OPTIONS)[batchStatus]?.color || '#d1d5db'
                  }}
                >
                  <optgroup label="Manufacturing Status">
                    {Object.entries(STATUS_OPTIONS).filter(([value]) => value !== 'flagged').map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                    <option value="flagged">Flagged</option>
                  </optgroup>
                  <optgroup label="COTS Status">
                    {Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowBatchStatusModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleBatchUpdateStatus} 
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Modal */}
      {showBatchDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBatchDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}</h3>
              <button className="modal-close" onClick={() => setShowBatchDeleteModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p className="delete-warning">
                Are you sure you want to delete <strong>{selectedParts.length}</strong> selected part{selectedParts.length !== 1 ? 's' : ''}?
              </p>
              <p className="delete-note">
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowBatchDeleteModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleBatchDelete} 
                  className="btn btn-danger"
                >
                  Delete {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPartDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Part Details: {selectedPartDetails.name}</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div style={{ display: 'grid', gap: '1rem' }}>
                {selectedPartDetails.is_cots !== undefined && (
                  <div>
                    <strong>Type:</strong> {selectedPartDetails.is_cots ? 'COTS (Commercial Off The Shelf)' : 'Custom Part'}
                  </div>
                )}
                {selectedPartDetails.details?.part_number && (
                  <div>
                    <strong>Part Number:</strong> {selectedPartDetails.details.part_number}
                  </div>
                )}
                {selectedPartDetails.details?.material && (
                  <div>
                    <strong>Material:</strong> {selectedPartDetails.details.material}
                  </div>
                )}
                {selectedPartDetails.details?.weight && (
                  <div>
                    <strong>Weight:</strong> {selectedPartDetails.details.weight}
                  </div>
                )}
                {selectedPartDetails.details?.vendor && (
                  <div>
                    <strong>Vendor:</strong> {selectedPartDetails.details.vendor}
                  </div>
                )}
                {selectedPartDetails.details?.part_quantity && (
                  <div>
                    <strong>Part Quantity:</strong> {selectedPartDetails.details.part_quantity}
                  </div>
                )}
                {selectedPartDetails.details?.order_quantity && (
                  <div>
                    <strong>Order Quantity:</strong> {selectedPartDetails.details.order_quantity}
                  </div>
                )}
                {selectedPartDetails.details?.order_date && (
                  <div>
                    <strong>Order Date:</strong> {selectedPartDetails.details.order_date}
                  </div>
                )}
                {(!selectedPartDetails.details || Object.keys(selectedPartDetails.details || {}).filter(k => selectedPartDetails.details[k]).length === 0) && (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                    No additional details available for this part.
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowDetailsModal(false)} 
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Part Type Modal */}
      {showUpdatePartTypeModal && partToUpdateType && (
        <div className="modal-overlay" onClick={() => setShowUpdatePartTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Part Type: {partToUpdateType.name}</h3>
              <button className="modal-close" onClick={() => setShowUpdatePartTypeModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!partToUpdateType.is_cots}
                    onChange={(e) => {
                      setPartToUpdateType({ ...partToUpdateType, is_cots: !e.target.checked });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Custom Part (Not COTS)
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={partToUpdateType.is_cots}
                    onChange={(e) => {
                      setPartToUpdateType({ ...partToUpdateType, is_cots: e.target.checked });
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  COTS (Commercial Off The Shelf)
                </label>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '1rem' }}>
                Note: Changing the part type will automatically update the status:
                <br />• COTS → Not Bought
                <br />• Custom → Ready to Manufacture
              </p>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowUpdatePartTypeModal(false);
                    setPartToUpdateType(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => handleUpdatePartType(partToUpdateType.id, partToUpdateType.is_cots)} 
                  className="btn btn-primary"
                >
                  Update Part Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Part Type Modal */}
      {showBatchUpdatePartTypeModal && (
        <div className="modal-overlay" onClick={() => setShowBatchUpdatePartTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Part Type for {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}</h3>
              <button className="modal-close" onClick={() => setShowBatchUpdatePartTypeModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>
                  <input
                    type="radio"
                    name="batchPartType"
                    checked={!batchPartType}
                    onChange={() => setBatchPartType(false)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Custom Part (Not COTS)
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="radio"
                    name="batchPartType"
                    checked={batchPartType}
                    onChange={() => setBatchPartType(true)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  COTS (Commercial Off The Shelf)
                </label>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '1rem' }}>
                Note: Changing the part type will automatically update the status:
                <br />• COTS → Not Bought
                <br />• Custom → Ready to Manufacture
              </p>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowBatchUpdatePartTypeModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleBatchUpdatePartType} 
                  className="btn btn-primary"
                >
                  Update Part Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {showEditPartModal && editingPart && (
        <div className="modal-overlay" onClick={closeEditPartModal}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Part: {editingPart.name}</h3>
              <button className="modal-close" onClick={closeEditPartModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditPart} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Part Name *</label>
                  <input
                    type="text"
                    value={editingPart.name}
                    onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Part Number</label>
                  <input
                    type="text"
                    value={editingPart.part_number || ''}
                    onChange={(e) => {
                      const partNum = e.target.value;
                      const isCots = isCOTSPartNumber(partNum);
                      setEditingPart({ 
                        ...editingPart, 
                        part_number: partNum,
                        is_cots: isCots,
                        status: isCots && !editingPart.is_cots ? (editingPart.status === 'ready-to-manufacture' ? 'not-bought' : editingPart.status) : editingPart.status,
                        details: { ...editingPart.details, part_number: partNum }
                      });
                    }}
                    placeholder="WCP-1234, REV-5678, etc."
                  />
                </div>
                <div className="form-group">
                  <label>{editingPart.is_cots ? 'Link' : 'OnShape Link'}</label>
                  <input
                    type="url"
                    value={editingPart.onshape_link || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, onshape_link: e.target.value })}
                    placeholder={editingPart.is_cots ? "https://..." : "https://cad.onshape.com/..."}
                  />
                  {editingPart.is_cots && (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
                      Enter any website link (vendor page, product page, etc.)
                    </p>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingPart.is_cots}
                      onChange={(e) => {
                        const isCots = e.target.checked;
                        setEditingPart({ 
                          ...editingPart, 
                          is_cots: isCots,
                          status: isCots ? 'not-bought' : 'ready-to-manufacture'
                        });
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    COTS (Commercial Off The Shelf)
                  </label>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingPart.status}
                    onChange={(e) => setEditingPart({ ...editingPart, status: e.target.value })}
                  >
                    {editingPart.is_cots ? (
                      Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))
                    ) : (
                      Object.entries(STATUS_OPTIONS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={editingPart.details.material || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, material: e.target.value }
                    })}
                    placeholder="e.g., 6061-T6 Aluminum"
                  />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input
                    type="text"
                    value={editingPart.details.weight || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, weight: e.target.value }
                    })}
                    placeholder="e.g., 0.5 lb"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    value={editingPart.details.vendor || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, vendor: e.target.value }
                    })}
                    placeholder="e.g., West Coast Products"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Part Quantity</label>
                  <input
                    type="text"
                    value={editingPart.details.part_quantity || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, part_quantity: e.target.value }
                    })}
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="form-group">
                  <label>Order Quantity</label>
                  <input
                    type="text"
                    value={editingPart.details.order_quantity || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, order_quantity: e.target.value }
                    })}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="form-group">
                  <label>Order Date</label>
                  <input
                    type="text"
                    value={editingPart.details.order_date || ''}
                    onChange={(e) => setEditingPart({ 
                      ...editingPart, 
                      details: { ...editingPart.details, order_date: e.target.value }
                    })}
                    placeholder="e.g., 2024-01-15"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Drawn By</label>
                  <input
                    type="text"
                    value={editingPart.drawn_by || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, drawn_by: e.target.value })}
                    placeholder="Student name"
                  />
                </div>
                <div className="form-group">
                  <label>Reviewed By</label>
                  <input
                    type="text"
                    value={editingPart.reviewed_by || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, reviewed_by: e.target.value })}
                    placeholder="Mentor name"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeEditPartModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import BOM Modal */}
      {showImportBOM && (
        <div className="modal-overlay" onClick={() => setShowImportBOM(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import BOM</h3>
              <button className="modal-close" onClick={() => setShowImportBOM(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                Select a CSV file exported from Onshape to import parts. Parts will be randomly assigned to subsystems.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleImportBOM(file);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              />
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowImportBOM(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {subsystems.map((subsystem) => (
          <div
            key={subsystem.id}
            className={`tab-wrapper ${activeTab === subsystem.id ? 'active' : ''}`}
          >
            <button
              className={`tab ${activeTab === subsystem.id ? 'active' : ''}`}
              onClick={() => setActiveTab(subsystem.id)}
            >
              {subsystem.name}
            </button>
            <button
              className="tab-delete"
              onClick={(e) => openDeleteSubsystemModal(subsystem.id, subsystem.name, e)}
              title="Delete subsystem"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={openAddSubsystemModal}
          className="tab-add"
          title="Add Subsystem"
        >
          +
        </button>
      </div>

      {/* Parts List */}
      {activeTab && (
        <div className="parts-content">
          <div className="parts-header">
            <div className="parts-header-left">
              <h3>{subsystems.find(s => s.id === activeTab)?.name} Parts</h3>
              <div className="parts-search-container">
                <input
                  type="text"
                  className="parts-search-input"
                  placeholder="Search parts..."
                  value={partsSearchQuery}
                  onChange={(e) => setPartsSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowImportBOM(true)}
                className="btn btn-secondary"
              >
                Import BOM
              </button>
              <button
                onClick={() => setShowAddPart(!showAddPart)}
                className="btn btn-primary"
              >
                {showAddPart ? 'Cancel' : '+ Add Part'}
              </button>
            </div>
          </div>

          {/* Parts Filter Bar */}
          <div className="manufacturing-filters" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div className="filter-group">
              <label htmlFor="parts-flagged-filter">Filter by Flag Status:</label>
              <select
                id="parts-flagged-filter"
                value={partsFlaggedFilter}
                onChange={(e) => setPartsFlaggedFilter(e.target.value)}
                className="vendor-filter-select"
              >
                <option value="all">All Parts</option>
                <option value="flagged">Flagged Only</option>
                <option value="not-flagged">Not Flagged</option>
              </select>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              border: '1px solid #dc2626'
            }}>
              <span style={{ fontWeight: '600', color: '#dc2626' }}>
                🚩 Flagged: {parts.filter(p => p.status === 'flagged').length}
              </span>
            </div>
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
                  <label>Part Number</label>
                  <input
                    type="text"
                    value={newPart.part_number}
                    onChange={(e) => {
                      const partNum = e.target.value;
                      const isCots = isCOTSPartNumber(partNum);
                      setNewPart({ 
                        ...newPart, 
                        part_number: partNum,
                        is_cots: isCots,
                        status: isCots ? (newPart.status === 'ready-to-manufacture' ? 'not-bought' : newPart.status) : newPart.status
                      });
                    }}
                    placeholder="WCP-1234, REV-5678, etc."
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
                  <label>
                    <input
                      type="checkbox"
                      checked={newPart.is_cots}
                      onChange={(e) => {
                        const isCots = e.target.checked;
                        setNewPart({ 
                          ...newPart, 
                          is_cots: isCots,
                          status: isCots ? 'not-bought' : 'ready-to-manufacture'
                        });
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    COTS (Commercial Off The Shelf)
                  </label>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newPart.status}
                    onChange={(e) => setNewPart({ ...newPart, status: e.target.value })}
                  >
                    {newPart.is_cots ? (
                      Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))
                    ) : (
                      Object.entries(STATUS_OPTIONS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={newPart.details.material || ''}
                    onChange={(e) => setNewPart({ 
                      ...newPart, 
                      details: { ...newPart.details, material: e.target.value }
                    })}
                    placeholder="e.g., 6061-T6 Aluminum"
                  />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input
                    type="text"
                    value={newPart.details.weight || ''}
                    onChange={(e) => setNewPart({ 
                      ...newPart, 
                      details: { ...newPart.details, weight: e.target.value }
                    })}
                    placeholder="e.g., 0.5 lb"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    value={newPart.details.vendor || ''}
                    onChange={(e) => setNewPart({ 
                      ...newPart, 
                      details: { ...newPart.details, vendor: e.target.value }
                    })}
                    placeholder="e.g., West Coast Products"
                  />
                </div>
              </div>
              <div className="form-row">
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

          {/* Batch Actions Toolbar */}
          {selectedParts.length > 0 && (
            <div className="batch-actions-toolbar">
              <div className="batch-actions-info">
                <strong>{selectedParts.length}</strong> part{selectedParts.length !== 1 ? 's' : ''} selected
              </div>
              <div className="batch-actions-buttons">
                <button
                  onClick={() => setShowBatchStatusModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Update Status
                </button>
                <button
                  onClick={() => {
                    // Initialize batchPartType based on selected parts (use most common type)
                    const selectedPartsData = parts.filter(p => selectedParts.includes(p.id));
                    const cotsCount = selectedPartsData.filter(p => p.is_cots).length;
                    setBatchPartType(cotsCount > selectedPartsData.length / 2);
                    setShowBatchUpdatePartTypeModal(true);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Update Part Type
                </button>
                <button
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="btn btn-danger btn-sm"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedParts([])}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Parts Table */}
          <div className="parts-table-container">
            {parts.length === 0 ? (
              <div className="empty-state">
                <p>No parts in this subsystem yet. Add one to get started!</p>
              </div>
            ) : (() => {
              // Filter parts based on flagged status
              let filteredParts = parts;
              if (partsFlaggedFilter === 'flagged') {
                filteredParts = filteredParts.filter(part => part.status === 'flagged');
              } else if (partsFlaggedFilter === 'not-flagged') {
                filteredParts = filteredParts.filter(part => part.status !== 'flagged');
              }

              // Filter parts based on search query
              if (partsSearchQuery.trim() !== '') {
                filteredParts = filteredParts.filter(part => 
                  part.name.toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
                  (part.details?.part_number || '').toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
                  (part.drawn_by || '').toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
                  (part.reviewed_by || '').toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
                  (part.details?.vendor || '').toLowerCase().includes(partsSearchQuery.toLowerCase())
                );
              }

              return filteredParts.length === 0 ? (
                <div className="empty-state">
                  <p>No parts found matching "{partsSearchQuery}".</p>
                </div>
              ) : (
                <table className="parts-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column"></th>
                      <th>Part Name</th>
                      <th>OnShape Link</th>
                      <th>Status</th>
                      <th>Drawn By</th>
                      <th>Reviewed By</th>
                      <th>Details</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((part) => (
                    <tr key={part.id} className={selectedParts.includes(part.id) ? 'selected' : ''}>
                      <td className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part.id)}
                          onChange={() => handleSelectPart(part.id)}
                        />
                      </td>
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
                          <button
                            onClick={() => openQuickAddLinkModal(part.id, part.name)}
                            className="btn-quick-add-link"
                            title="Add Onshape link"
                          >
                            Add Link
                          </button>
                        )}
                      </td>
                      <td>
                        <select
                          value={part.status}
                          onChange={(e) => handleUpdatePartStatus(part.id, e.target.value)}
                          className="status-select"
                          style={{
                            backgroundColor: (part.is_cots ? COTS_STATUS_OPTIONS[part.status] : STATUS_OPTIONS[part.status])?.bgColor || '#f3f4f6',
                            color: (part.is_cots ? COTS_STATUS_OPTIONS[part.status] : STATUS_OPTIONS[part.status])?.color || '#1a1a1a',
                            borderColor: (part.is_cots ? COTS_STATUS_OPTIONS[part.status] : STATUS_OPTIONS[part.status])?.color || '#d1d5db'
                          }}
                        >
                          {part.is_cots ? (
                            Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                              <option key={value} value={value}>{label}</option>
                            ))
                          ) : (
                            Object.entries(STATUS_OPTIONS).map(([value, { label }]) => (
                              <option key={value} value={value}>{label}</option>
                            ))
                          )}
                        </select>
                      </td>
                      <td>{part.drawn_by || '-'}</td>
                      <td>{part.reviewed_by || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleShowDetails(part)}
                          className="btn btn-secondary btn-sm"
                          title="View part details"
                        >
                          Details
                        </button>
                        {part.is_cots && (
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '0.75rem', 
                            color: '#2563eb',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            COTS
                          </span>
                        )}
                      </td>
                      <td>
                        {part.status === 'flagged' && part.details?.flag_note && (
                          <button
                            onClick={() => openFlagNoteModal(part)}
                            className="btn btn-secondary btn-sm"
                            title="View flag note"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              borderColor: '#dc2626'
                            }}
                          >
                            🚩 Flag Note
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="action-menu-wrapper">
                          <button
                            onClick={(e) => openActionMenuForPart(part.id, e)}
                            className="btn btn-secondary btn-sm"
                            style={{ minWidth: '80px' }}
                          >
                            Actions ▼
                          </button>
                          {openActionMenu === part.id && (
                            <div className="action-menu">
                              <button
                                onClick={() => handleActionMenuClick(part.id, 'edit')}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleActionMenuClick(part.id, 'updateType')}
                              >
                                Update Part Type
                              </button>
                              <button
                                onClick={() => handleActionMenuClick(part.id, 'delete')}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
        </div>
      )}

      {/* Manufacturing Dashboard View */}
      {mainView === 'manufacturing' && (
        <div className="manufacturing-dashboard">
          <div className="manufacturing-header">
            <h2>Manufacturing Dashboard</h2>
            <div className="manufacturing-stats">
              <div className="stat-card">
                <div className="stat-value">{manufacturingParts.length}</div>
                <div className="stat-label">Ready to Manufacture</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="manufacturing-filters">
            <div className="parts-search-container" style={{ maxWidth: '400px' }}>
              <input
                type="text"
                className="parts-search-input"
                placeholder="Search parts..."
                value={manufacturingSearchQuery}
                onChange={(e) => setManufacturingSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="manufacturing-subsystem-filter">Subsystem:</label>
              <select
                id="manufacturing-subsystem-filter"
                value={manufacturingSubsystemFilter}
                onChange={(e) => setManufacturingSubsystemFilter(e.target.value)}
                className="vendor-filter-select"
              >
                <option value="all">All Subsystems</option>
                {[...new Set(manufacturingParts.map(p => p.subsystems?.name).filter(Boolean))].sort().map(subsystem => (
                  <option key={subsystem} value={subsystem}>{subsystem}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="manufacturing-part-type-filter">Part Type:</label>
              <select
                id="manufacturing-part-type-filter"
                value={manufacturingPartTypeFilter}
                onChange={(e) => setManufacturingPartTypeFilter(e.target.value)}
                className="vendor-filter-select"
              >
                <option value="all">All Types</option>
                <option value="hex">Hex</option>
                <option value="tube">Tube</option>
                <option value="plate">Plate</option>
                <option value="bracket">Bracket</option>
                <option value="mount">Mount</option>
                <option value="spacer">Spacer</option>
                <option value="bushing">Bushing</option>
              </select>
            </div>
          </div>

          <div className="manufacturing-orders">
            <h3>Parts Ready to Manufacture</h3>
            {manufacturingParts.length === 0 ? (
              <div className="empty-state">
                <p>No parts ready to manufacture. All parts are either in review or already manufactured.</p>
              </div>
            ) : (() => {
              // Filter parts based on search query, subsystem, and part type
              let filteredParts = manufacturingParts;

              // Apply subsystem filter
              if (manufacturingSubsystemFilter !== 'all') {
                filteredParts = filteredParts.filter(part => 
                  part.subsystems?.name === manufacturingSubsystemFilter
                );
              }

              // Apply part type filter (checks if the part name contains the type)
              if (manufacturingPartTypeFilter !== 'all') {
                filteredParts = filteredParts.filter(part => 
                  part.name.toLowerCase().includes(manufacturingPartTypeFilter.toLowerCase())
                );
              }

              // Apply search filter
              if (manufacturingSearchQuery.trim() !== '') {
                const searchLower = manufacturingSearchQuery.toLowerCase();
                filteredParts = filteredParts.filter(part => 
                  part.name.toLowerCase().includes(searchLower) ||
                  (part.subsystems?.name || '').toLowerCase().includes(searchLower) ||
                  (part.drawn_by || '').toLowerCase().includes(searchLower) ||
                  (part.reviewed_by || '').toLowerCase().includes(searchLower) ||
                  (part.details?.part_number || '').toLowerCase().includes(searchLower)
                );
              }

              return filteredParts.length === 0 ? (
                <div className="empty-state">
                  <p>No parts found matching your filters.</p>
                </div>
              ) : (
                <div className="order-grid">
                  {filteredParts.map((part) => (
                  <div key={part.id} className="order-card">
                    <div className="order-card-header">
                      <h4>{part.name}</h4>
                      <span className="order-subsystem">
                        {part.subsystems?.name || 'Unknown Subsystem'}
                      </span>
                    </div>
                    <div className="order-card-body">
                      {part.onshape_link ? (
                        <a
                          href={part.onshape_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="order-link"
                        >
                          View Drawing →
                        </a>
                      ) : (
                        <button
                          onClick={() => openQuickAddLinkModal(part.id, part.name)}
                          className="btn-quick-add-link"
                          title="Add Onshape link"
                        >
                          Add Link
                        </button>
                      )}
                      {part.drawn_by && (
                        <div className="order-meta">
                          <span className="order-meta-label">Drawn by:</span>
                          <span className="order-meta-value">{part.drawn_by}</span>
                        </div>
                      )}
                      {part.reviewed_by && (
                        <div className="order-meta">
                          <span className="order-meta-label">Reviewed by:</span>
                          <span className="order-meta-value">{part.reviewed_by}</span>
                        </div>
                      )}
                    </div>
                    <div className="order-card-actions">
                      <button
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('parts')
                              .update({ status: 'manufactured' })
                              .eq('id', part.id);
                            if (error) throw error;
                            fetchManufacturingParts();
                            // Also refresh parts in parts management view if activeTab exists
                            if (activeTab) {
                              fetchParts(activeTab);
                            }
                          } catch (error) {
                            console.error('Error updating status:', error);
                            showAlert('Error updating status: ' + error.message);
                          }
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Mark as Manufactured
                      </button>
                      <button
                        onClick={() => openFlagModal(part)}
                        className="btn btn-secondary btn-sm"
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Flag
                      </button>
                    </div>
                  </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Buy List View */}
      {mainView === 'buylist' && (
        <div className="buy-list-dashboard">
          <div className="buy-list-header">
            <h2>Buy List</h2>
            <div className="buy-list-stats">
              <div className="stat-card">
                <div className="stat-value">{cotsParts.length}</div>
                <div className="stat-label">COTS Items</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {cotsParts.filter(p => p.status === 'not-bought').length}
                </div>
                <div className="stat-label">Not Bought</div>
              </div>
            </div>
          </div>

          <div className="buy-list-filters">
            <div className="parts-search-container" style={{ maxWidth: '400px' }}>
              <input
                type="text"
                className="parts-search-input"
                placeholder="Search parts..."
                value={buyListSearchQuery}
                onChange={(e) => {
                  setBuyListSearchQuery(e.target.value);
                  setSelectedCotsParts([]); // Clear selection when search changes
                }}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="vendor-filter">Filter by Vendor:</label>
              <select
                id="vendor-filter"
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setSelectedCotsParts([]); // Clear selection when filter changes
                }}
                className="vendor-filter-select"
              >
                <option value="all">All Vendors</option>
                {[...new Set(cotsParts.map(p => {
                  const partNum = p.details?.part_number || '';
                  return detectVendorFromPartNumber(partNum);
                }))].sort().map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          {selectedCotsParts.length > 0 && (
            <div className="batch-actions-toolbar">
              <div className="batch-actions-info">
                <strong>{selectedCotsParts.length}</strong> item{selectedCotsParts.length !== 1 ? 's' : ''} selected
              </div>
              <div className="batch-actions-buttons">
                <button
                  onClick={() => setShowBatchCotsStatusModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Update Status
                </button>
                <button
                  onClick={() => setSelectedCotsParts([])}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <div className="buy-list-content">
            {cotsParts.length === 0 ? (
              <div className="empty-state">
                <p>No COTS items found. Add parts marked as COTS to see them here.</p>
              </div>
            ) : (() => {
              // Filter parts based on vendor and search query
              let filteredParts = vendorFilter === 'all' 
                ? cotsParts 
                : cotsParts.filter(p => {
                    const partNum = p.details?.part_number || '';
                    return detectVendorFromPartNumber(partNum) === vendorFilter;
                  });

              // Apply search filter
              if (buyListSearchQuery.trim() !== '') {
                const searchLower = buyListSearchQuery.toLowerCase();
                filteredParts = filteredParts.filter(p => {
                  const partNum = p.details?.part_number || '';
                  const vendor = detectVendorFromPartNumber(partNum);
                  return (
                    p.name.toLowerCase().includes(searchLower) ||
                    (p.subsystems?.name || '').toLowerCase().includes(searchLower) ||
                    partNum.toLowerCase().includes(searchLower) ||
                    vendor.toLowerCase().includes(searchLower) ||
                    (p.details?.material || '').toLowerCase().includes(searchLower) ||
                    (p.details?.vendor || '').toLowerCase().includes(searchLower)
                  );
                });
              }

              return filteredParts.length === 0 ? (
                <div className="empty-state">
                  <p>No items found matching your search and filters.</p>
                </div>
              ) : (
                <div className="buy-list-table-container">
                  <table className="buy-list-table">
                    <thead>
                      <tr>
                        <th className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={filteredParts.length > 0 && selectedCotsParts.length === filteredParts.length}
                            onChange={handleSelectAllCots}
                            title="Select all"
                          />
                        </th>
                        <th>Part Name</th>
                        <th>Qty</th>
                        <th>Part Number</th>
                        <th>Vendor</th>
                        <th>Link</th>
                        <th>Status</th>
                        <th>Details</th>
                        <th>Flag</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.map((part) => {
                        const partNumber = part.details?.part_number || '';
                        const vendor = detectVendorFromPartNumber(partNumber);
                        const qty = part.details?.order_quantity || part.details?.part_quantity || '-';
                        
                        return (
                          <tr key={part.id} className={selectedCotsParts.includes(part.id) ? 'selected' : ''}>
                            <td className="checkbox-column">
                              <input
                                type="checkbox"
                                checked={selectedCotsParts.includes(part.id)}
                                onChange={() => handleSelectCotsPart(part.id)}
                              />
                            </td>
                            <td>{part.name}</td>
                            <td>{qty}</td>
                            <td>{partNumber || '-'}</td>
                            <td>{vendor}</td>
                            <td>
                              {part.onshape_link ? (
                                <a
                                  href={part.onshape_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link"
                                >
                                  View Link
                                </a>
                              ) : (
                                <button
                                  onClick={() => openQuickAddLinkModal(part.id, part.name, true, part.onshape_link || '')}
                                  className="btn-quick-add-link"
                                  title="Add link"
                                >
                                  Add Link
                                </button>
                              )}
                            </td>
                            <td>
                              <select
                                value={part.status}
                                onChange={(e) => handleUpdatePartStatus(part.id, e.target.value)}
                                className="status-select"
                                style={{
                                  backgroundColor: COTS_STATUS_OPTIONS[part.status]?.bgColor || '#f3f4f6',
                                  color: COTS_STATUS_OPTIONS[part.status]?.color || '#1a1a1a',
                                  borderColor: COTS_STATUS_OPTIONS[part.status]?.color || '#d1d5db'
                                }}
                              >
                                {Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                onClick={() => handleShowDetails(part)}
                                className="btn btn-secondary btn-sm"
                                title="View part details"
                              >
                                Details
                              </button>
                            </td>
                            <td>
                              <button
                                onClick={() => openFlagModal(part)}
                                className="btn btn-secondary btn-sm"
                                title="Flag this item"
                              >
                                Flag
                              </button>
                              {part.status === 'flagged' && part.details?.flag_note && (
                                <button
                                  onClick={() => openFlagNoteModal(part)}
                                  className="btn btn-secondary btn-sm"
                                  title="View flag note"
                                  style={{
                                    marginLeft: '0.25rem',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    borderColor: '#dc2626'
                                  }}
                                >
                                  🚩
                                </button>
                              )}
                            </td>
                            <td>
                              {part.status === 'not-bought' && (
                                <button
                                  onClick={() => handleMarkAsBought(part.id)}
                                  className="btn btn-primary btn-sm"
                                  title="Mark as bought"
                                >
                                  Mark as Bought
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && flaggingPart && (
        <div className="modal-overlay" onClick={closeFlagModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Flag Part: {flaggingPart.name}</h3>
              <button className="modal-close" onClick={closeFlagModal}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Flag Note *</label>
                {mainView === 'buylist' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={() => setFlagNote('Out of Stock')}
                      style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '9999px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        lineHeight: '1.25'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.color = '#1a1a1a';
                      }}
                    >
                      Out of Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlagNote('Wrong ID')}
                      style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '9999px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        lineHeight: '1.25'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.color = '#1a1a1a';
                      }}
                    >
                      Wrong ID
                    </button>
                  </div>
                )}
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Enter a note explaining why this part is flagged..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={closeFlagModal} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleFlagPart} 
                  className="btn btn-primary"
                >
                  Confirm Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag Note View Modal */}
      {showFlagNoteModal && viewingFlagNote !== null && (
        <div className="modal-overlay" onClick={closeFlagNoteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Flag Note</h3>
              <button className="modal-close" onClick={closeFlagNoteModal}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div style={{
                padding: '1rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                color: '#991b1b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {viewingFlagNote}
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={closeFlagNoteModal} 
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch COTS Status Update Modal */}
      {showBatchCotsStatusModal && (
        <div className="modal-overlay" onClick={() => setShowBatchCotsStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status for {selectedCotsParts.length} Item{selectedCotsParts.length !== 1 ? 's' : ''}</h3>
              <button className="modal-close" onClick={() => setShowBatchCotsStatusModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>New Status *</label>
                <select
                  value={batchCotsStatus}
                  onChange={(e) => setBatchCotsStatus(e.target.value)}
                  style={{
                    backgroundColor: COTS_STATUS_OPTIONS[batchCotsStatus]?.bgColor || '#ffffff',
                    color: COTS_STATUS_OPTIONS[batchCotsStatus]?.color || '#1a1a1a',
                    borderColor: COTS_STATUS_OPTIONS[batchCotsStatus]?.color || '#d1d5db'
                  }}
                >
                  {Object.entries(COTS_STATUS_OPTIONS).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowBatchCotsStatusModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleBatchUpdateCotsStatus} 
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Link Modal - Available in all views */}
      {showQuickAddLinkModal && partToAddLink && (
        <div className="modal-overlay" onClick={closeQuickAddLinkModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Link: {partToAddLink.name}</h3>
              <button className="modal-close" onClick={closeQuickAddLinkModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleQuickAddLink} className="modal-form">
              <div className="form-group">
                <label>{partToAddLink.isCots ? 'Link *' : 'Onshape Link *'}</label>
                <input
                  type="url"
                  value={quickLinkValue}
                  onChange={(e) => setQuickLinkValue(e.target.value)}
                  placeholder={partToAddLink.isCots ? "https://..." : "https://cad.onshape.com/..."}
                  required
                  autoFocus
                />
                {partToAddLink.isCots && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
                    Enter any website link (vendor page, product page, etc.)
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeQuickAddLinkModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartsManager;

