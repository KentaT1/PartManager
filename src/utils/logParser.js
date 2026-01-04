/**
 * WPILib Data Log Parser
 * Parses .wpilog files to extract elapsed time in minutes
 * Based on WPILib Data Log File Format Specification
 * Reference: https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html
 */

/**
 * Parse a WPILib log file and calculate elapsed time in minutes
 * @param {ArrayBuffer} fileData - The binary log file data
 * @returns {Promise<number>} - Elapsed time in minutes
 */
export async function parseWpilogFile(fileData) {
  try {
    const dataView = new DataView(fileData);
    let position = 0;
    
    // WPILib log file format:
    // - Header: 12 bytes (magic number + version)
    // - Records: variable length with timestamps
    
    // Check magic number (first 4 bytes should be "WPIL")
    const magic = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3)
    );
    
    if (magic !== 'WPIL') {
      throw new Error('Invalid WPILib log file format');
    }
    
    // Skip header (12 bytes: 4 byte magic + 4 byte version + 4 byte extra header)
    position = 12;
    
    let firstTimestamp = null;
    let lastTimestamp = null;
    
    // Parse records
    while (position < dataView.byteLength - 8) {
      try {
        // Record format: 4 byte entry ID + 4 byte timestamp + data
        // eslint-disable-next-line no-unused-vars
        const entryId = dataView.getUint32(position, true); // little-endian
        const timestamp = dataView.getUint32(position + 4, true); // microseconds
        
        // Check if this is a valid timestamp (reasonable range)
        // Timestamps are in microseconds since FPGA start
        if (timestamp > 0 && timestamp < 1e12) {
          if (firstTimestamp === null) {
            firstTimestamp = timestamp;
          }
          lastTimestamp = timestamp;
        }
        
        // Move to next record (minimum record size is 8 bytes)
        // We'll skip ahead conservatively
        position += 8;
        
        // Try to find next record by looking for reasonable entry IDs
        // This is a simplified parser - a full parser would need to handle
        // all record types properly
        if (position < dataView.byteLength - 8) {
          const nextEntryId = dataView.getUint32(position, true);
          // If next entry ID looks invalid, skip ahead
          if (nextEntryId > 1000000) {
            position += 4;
          }
        }
      } catch (e) {
        // If we hit an error, try to continue
        position += 4;
        if (position >= dataView.byteLength) break;
      }
    }
    
    if (firstTimestamp === null || lastTimestamp === null) {
      throw new Error('Could not extract timestamps from log file');
    }
    
    // Calculate elapsed time in minutes
    // Timestamps are in microseconds
    const elapsedMicroseconds = lastTimestamp - firstTimestamp;
    const elapsedMinutes = elapsedMicroseconds / (1000000 * 60);
    
    return Math.max(0, elapsedMinutes);
  } catch (error) {
    console.error('Error parsing log file:', error);
    throw new Error(`Failed to parse log file: ${error.message}`);
  }
}

/**
 * Alternative parser using a more robust approach
 * Tries to find timestamp records more reliably
 */
export async function parseWpilogFileRobust(fileData) {
  try {
    const dataView = new DataView(fileData);
    
    // Check magic number
    const magic = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3)
    );
    
    if (magic !== 'WPIL') {
      throw new Error('Invalid WPILib log file format');
    }
    
    // Scan through the file looking for timestamp patterns
    // Timestamps are typically in the range of microseconds since FPGA start
    const timestamps = [];
    
    for (let i = 12; i < dataView.byteLength - 8; i += 4) {
      try {
        const value = dataView.getUint32(i, true);
        // Reasonable timestamp range: 0 to 1 hour in microseconds
        if (value > 0 && value < 3600000000) {
          // Check if this might be a timestamp by looking at context
          // Timestamps often appear in pairs (entry ID + timestamp)
          const prevValue = i >= 4 ? dataView.getUint32(i - 4, true) : 0;
          if (prevValue < 10000 && value > 1000) {
            timestamps.push(value);
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (timestamps.length < 2) {
      throw new Error('Could not find enough timestamps in log file');
    }
    
    // Get first and last timestamps
    const sortedTimestamps = timestamps.sort((a, b) => a - b);
    const firstTimestamp = sortedTimestamps[0];
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
    
    // Calculate elapsed time in minutes
    const elapsedMicroseconds = lastTimestamp - firstTimestamp;
    const elapsedMinutes = elapsedMicroseconds / (1000000 * 60);
    
    return Math.max(0, elapsedMinutes);
  } catch (error) {
    console.error('Error parsing log file (robust method):', error);
    throw error;
  }
}

