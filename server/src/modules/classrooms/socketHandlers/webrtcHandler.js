export default function registerWebRTCHandler(io, socket) {
  // WebRTC Signaling Events - Offer
  socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
    // Validate that the requesting socket is in a room
    if (!socket.data || !socket.data.roomId) {
      socket.emit("unauthorized", { message: "You must join a room first" });
      return;
    }

    // Validate that the target socket exists and is in the same room
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (
      !targetSocket ||
      !targetSocket.data ||
      targetSocket.data.roomId !== socket.data.roomId
    ) {
      // Gracefully drop unauthorized stream injection attempts
      return;
    }

    socket.to(targetSocketId).emit("webrtc-offer", {
      callerSocketId: socket.id,
      callerUser: socket.data ? socket.data.user : socket.user,
      offer,
    });
  });

  // WebRTC Signaling Events - Answer
  socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
    // Validate that both sockets exist and are in the same room
    if (!socket.data || !socket.data.roomId) {
      socket.emit("unauthorized", { message: "You must join a room first" });
      return;
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (
      !targetSocket ||
      !targetSocket.data ||
      targetSocket.data.roomId !== socket.data.roomId
    ) {
      // Gracefully drop unauthorized stream signaling answers
      return;
    }

    socket.to(targetSocketId).emit("webrtc-answer", {
      answererSocketId: socket.id,
      answer,
    });
  });

  // Toggle Mute
  socket.on("toggle-mute", ({ roomId, isMuted }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("mute-toggled", { socketId: socket.id, isMuted });
  });

  // Toggle Video
  socket.on("toggle-video", ({ roomId, isVideoOff }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("video-toggled", { socketId: socket.id, isVideoOff });
  });

  // Toggle Screen Share
  socket.on("toggle-screen-share", ({ roomId, isScreenSharing }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("screen-share-toggled", { socketId: socket.id, isScreenSharing });
  });
}
