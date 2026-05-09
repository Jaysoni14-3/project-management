import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* Single shared Socket.IO connection for the whole tab. Hooks subscribe
   via on()/off() rather than instantiating their own client — otherwise
   we'd open one socket per mounted hook and waste server resources.

   Auth: the server reads the same JWT cookie used by REST. The socket
   handshake includes credentials so the cookie travels with it. */
let socket = null;

const ensureSocket = () => {
  if (socket) return socket;
  socket = io(API_URL, {
    withCredentials: true,
    autoConnect: true,
    /* Polling fallback first then upgrade to WebSocket — works in more
       restrictive networks. Default behaviour but spelled out. */
    transports: ["polling", "websocket"],
  });
  return socket;
};

/* Imperative helpers — kept tiny on purpose. Hooks own state, the
   socket just emits. */
export const getSocket = () => ensureSocket();

export const onSocketEvent = (event, handler) => {
  const s = ensureSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
};

export const joinConversation = (conversationId) => {
  if (!conversationId) return;
  const s = ensureSocket();
  s.emit("conversation:join", conversationId);
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};
