import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const taskOpen = (s) => s !== "done";
const bugOpen = (s) => s !== "done";

export const listenToTaskCounts = (callback) => {
  const q = query(collectionGroup(db, "tasks"));
  return onSnapshot(
    q,
    (snap) => {
      const counts = {};
      let open = 0;
      snap.docs.forEach((d) => {
        const projectId = d.ref.parent.parent?.id;
        if (!projectId) return;
        const status = d.get("status") || "todo";
        if (!taskOpen(status)) return;
        counts[projectId] = (counts[projectId] || 0) + 1;
        open += 1;
      });
      callback({ countsByProjectId: counts, totalOpen: open, total: snap.size });
    },
    (err) => {
      console.error("listenToTaskCounts:", err);
      callback({ countsByProjectId: {}, totalOpen: 0, total: 0 });
    }
  );
};

export const listenToBugCounts = (callback) => {
  const q = query(collectionGroup(db, "bugs"));
  return onSnapshot(
    q,
    (snap) => {
      const counts = {};
      let open = 0;
      snap.docs.forEach((d) => {
        const projectId = d.ref.parent.parent?.id;
        if (!projectId) return;
        const status = d.get("status") || "backlog";
        if (!bugOpen(status)) return;
        counts[projectId] = (counts[projectId] || 0) + 1;
        open += 1;
      });
      callback({ countsByProjectId: counts, totalOpen: open });
    },
    (err) => {
      console.error("listenToBugCounts:", err);
      callback({ countsByProjectId: {}, totalOpen: 0 });
    }
  );
};

export const listenToMeetingNotesCount = (callback) => {
  const q = query(collectionGroup(db, "meetingNotes"));
  return onSnapshot(
    q,
    (snap) => {
      const counts = {};
      snap.docs.forEach((d) => {
        const projectId = d.ref.parent.parent?.id;
        if (!projectId) return;
        counts[projectId] = (counts[projectId] || 0) + 1;
      });
      callback({ countsByProjectId: counts, total: snap.size });
    },
    (err) => {
      console.error("listenToMeetingNotesCount:", err);
      callback({ countsByProjectId: {}, total: 0 });
    }
  );
};

export const getManagers = async () => {
  const q = query(collection(db, "users"), where("isManager", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getDashboardStats = async () => {
  const employeesQuery = query(
    collection(db, "users"),
    where("role", "not-in", ["admin"])
  );
  const activeProjectsQuery = query(
    collection(db, "projects"),
    where("status", "==", "active")
  );
  const completedProjectsQuery = query(
    collection(db, "projects"),
    where("status", "==", "completed")
  );

  const [employeeSnap, activeSnap, completedSnap] = await Promise.all([
    getCountFromServer(employeesQuery),
    getCountFromServer(activeProjectsQuery),
    getCountFromServer(completedProjectsQuery),
  ]);

  return {
    employeeCount: employeeSnap.data().count,
    activeProjectCount: activeSnap.data().count,
    completedProjectCount: completedSnap.data().count,
  };
};
