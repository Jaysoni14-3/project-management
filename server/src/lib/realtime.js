/* Singleton holder for the Socket.IO server. Routes import `getIo()`
   to broadcast events; the bootstrap code in index.js calls
   `setIo(io)` once the Socket.IO server is attached to the http
   server. Kept tiny on purpose — no abstraction beyond "give me io." */

let io = null;

export const setIo = (instance) => {
  io = instance;
};

export const getIo = () => io;

/* Convenience: emit to all sockets in a room without callers having to
   null-check `io` themselves. Best-effort — failures are logged but
   don't throw, since chat fan-out must never block a user's send. */
export const emitToRoom = (room, event, payload) => {
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch (err) {
    console.error("[realtime] emit failed:", err);
  }
};
