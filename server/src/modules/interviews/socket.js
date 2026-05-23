import InterviewSession from "../../database/models/InterviewSession.js";

export function initInterviewSockets(io) {
  io.on("connection", (socket) => {
    // Join an active interview session as Candidate, Conductor, or Observer
    socket.on("join-interview", async ({ sessionId }) => {
      try {
        const session = await InterviewSession.findById(sessionId);
        if (!session) {
          socket.emit("unauthorized", { message: "Interview session not found" });
          return;
        }

        const user = socket.user; // populated by auth middleware
        if (!user) {
          socket.emit("unauthorized", { message: "User authentication required" });
          return;
        }

        socket.join(sessionId);
        socket.data = {
          sessionId,
          user: {
            id: user._id || user.id,
            name: user.name || user.email,
            role: user.role,
          },
        };

        // Broadcast to the room that someone joined
        socket.to(sessionId).emit("participant-joined", {
          socketId: socket.id,
          user: socket.data.user,
        });

        // Send existing participants to the joiner
        const clients = io.sockets.adapter.rooms.get(sessionId);
        const participants = [];
        if (clients) {
          for (const clientId of clients) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket && clientSocket.data?.user) {
              participants.push({
                socketId: clientId,
                user: clientSocket.data.user,
              });
            }
          }
        }
        socket.emit("interview-participants", participants);

      } catch (error) {
        console.error("Error joining interview room:", error);
        socket.emit("error", { message: "Internal server error during join" });
      }
    });

    // Real-time answer streaming (optional, e.g. for live code/text)
    socket.on("interview-typing", ({ sessionId, text }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      socket.to(sessionId).emit("interview-typing", { text });
    });

    // Private notes for observers
    socket.on("save-private-note", ({ sessionId, note }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      // In a full implementation, you would save this to a notes collection
      // For now, we acknowledge success
      socket.emit("private-note-saved", { success: true, timestamp: Date.now() });
    });

    // Observer/Conductor leaves feedback
    socket.on("submit-live-feedback", ({ sessionId, feedback }) => {
       if (!socket.data || socket.data.sessionId !== sessionId) return;
       // Only broadcast to other observers/conductors, not candidate
       // Or broadcast to room, but frontend handles who sees it
       socket.to(sessionId).emit("live-feedback-received", {
         sender: socket.data.user,
         feedback,
         timestamp: Date.now()
       });
    });

    socket.on("disconnect", () => {
      if (socket.data && socket.data.sessionId) {
        const { sessionId, user } = socket.data;
        socket.to(sessionId).emit("participant-left", {
          socketId: socket.id,
          user,
        });
      }
    });
  });
}
