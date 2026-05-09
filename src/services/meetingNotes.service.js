import * as fb from "./meetingNotes.firebase.service";
import * as api from "./meetingNotes.api.service";

const impl = import.meta.env.VITE_BACKEND === "api" ? api : fb;

export const listenToRecentMeetingNotes = (...args) => impl.listenToRecentMeetingNotes(...args);
export const listenToMeetingNotes = (...args) => impl.listenToMeetingNotes(...args);
export const createMeetingNote = (...args) => impl.createMeetingNote(...args);
export const updateMeetingNote = (...args) => impl.updateMeetingNote(...args);
export const deleteMeetingNote = (...args) => impl.deleteMeetingNote(...args);
