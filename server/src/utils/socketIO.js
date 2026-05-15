let io;

/**
 * Store the Socket.io instance
 * @param {Object} ioInstance - The Server instance from socket.io
 */
export const setIO = (ioInstance) => {
  io = ioInstance;
};

/**
 * Get the stored Socket.io instance
 * @returns {Object} The Server instance
 */
export const getIO = () => {
  return io;
};
