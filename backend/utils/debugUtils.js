const fs = require('fs');
const path = require('path');
const util = require('util');

const DEBUG_LOG_PATH = path.join(__dirname, '..', 'logs', 'game-debug.log');

/**
 * Enhanced debug logger that writes to both console and a file
 * @param {string} module - The module name (e.g., 'gameSocketHandlers', 'PartidaGame')
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
function debugLog(module, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}][${module}] ${message}`;
    
    if (data !== null) {
        // Format object data for better readability
        const formattedData = util.inspect(data, {
            depth: 3,
            colors: false, 
            maxArrayLength: 5
        });
        logMessage += `\n${formattedData}\n`;
    }
    
    // Log to console
    console.log(logMessage);
    
    // Log to file
    try {
        fs.appendFileSync(DEBUG_LOG_PATH, logMessage + '\n');
    } catch (error) {
        console.error(`Failed to write to debug log: ${error.message}`);
    }
}

/**
 * Check room membership for a socket
 * @param {object} socket - The socket.io socket object
 * @returns {object} Object with room membership info
 */
function getSocketRoomInfo(socket) {
    if (!socket || !socket.rooms) {
        return { inRooms: false, rooms: [] };
    }
    
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    return {
        inRooms: rooms.length > 0,
        rooms,
        socketId: socket.id
    };
}

/**
 * Get debug info for a specific game room
 * @param {object} io - The socket.io server instance
 * @param {string} roomId - The room ID to inspect
 * @returns {Promise<object>} Promise resolving to room info
 */
async function getRoomDebugInfo(io, roomId) {
    if (!io || !roomId) {
        return { error: 'Invalid io instance or room ID' };
    }
    
    try {
        const sockets = await io.in(roomId).fetchSockets();
        
        return {
            roomId,
            socketCount: sockets.length,
            sockets: sockets.map(s => ({
                id: s.id,
                userId: s.currentUserId || 'unknown',
                rooms: Array.from(s.rooms || [])
            }))
        };
    } catch (error) {
        return { error: error.message, roomId };
    }
}

module.exports = {
    debugLog,
    getSocketRoomInfo,
    getRoomDebugInfo
};
