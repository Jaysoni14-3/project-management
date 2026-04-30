import { collection, getDocs, query, orderBy, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";


export const getAllEmployees = async () => {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

export const getAssignedProjectsToEmployee = async (
  projectId,
  employeeIds
) => {
  const promises = employeeIds.map((empId) => {
    updateDoc(doc(db, "users", empId), {
      assignedProjects: arrayUnion(projectId),
    })
  })

  await Promise.all(promises)
}