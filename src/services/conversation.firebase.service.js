/* Chat is API-only — there is no Firestore equivalent. The dispatcher
   pattern (api/firebase facade in conversation.service.js) keeps a
   uniform interface, so when the legacy Firebase backend is selected
   chat is quietly disabled rather than throwing on import. */

const unsupported = "Chat is not available on the Firebase backend.";

export const listConversations = async () => [];
export const getConversation = async () => null;
export const findOrCreateDm = async () => {
  throw new Error(unsupported);
};
export const listMessages = async () => [];
export const sendMessage = async () => {
  throw new Error(unsupported);
};
export const editMessage = async () => {
  throw new Error(unsupported);
};
export const deleteMessage = async () => {
  throw new Error(unsupported);
};
export const toggleLike = async () => {
  throw new Error(unsupported);
};
export const searchMessages = async () => [];
export const markRead = async () => null;
