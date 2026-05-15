/**
 * Initialize notification-related socket events
 * @param {Object} io - Socket.io instance
 */
export function initNotificationSockets(io) {
  io.on("connection", (socket) => {
    /**
     * Join a notification room for a specific user.
     * This allows us to emit events to specific users by their ID.
     */
    socket.on("join-notifications", (userId) => {
      if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        socket.emit("notification-ready", { room: roomName });
      }
    });

    socket.on("disconnect", () => {
      // Socket automatically leaves rooms on disconnect
    });
  });
}
