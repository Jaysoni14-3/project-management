import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/* -- Session -- */

export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      const profile = snap.exists() ? snap.data() : {};
      callback({
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email,
        ...profile,
      });
    } catch (err) {
      console.error("auth profile fetch failed:", err);
      callback({
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email,
      });
    }
  });

export const login = async (email, password) => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  await signOut(auth);
};

/* -- Self-service profile -- */

export const updateMyProfile = async (uid, patch) => {
  await updateDoc(doc(db, "users", uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const fbUser = auth.currentUser;
  if (!fbUser?.email) throw new Error("Not signed in");
  const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, cred);
  await updatePassword(fbUser, newPassword);
};

/* -- Admin: create a new user account + profile doc -- */

export const createUserAccount = async ({ email, password, profile }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const newUserId = cred.user.uid;
  await setDoc(doc(db, "users", newUserId), {
    ...profile,
    email,
    createdAt: serverTimestamp(),
  });
  return { id: newUserId };
};
