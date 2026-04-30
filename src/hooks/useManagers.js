import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../services/firebase"

const useManagers = () => {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("isManager", "==", true)
        )

        const snapshot = await getDocs(q)

        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setManagers(list)
      } catch (err) {
        console.error("Error fetching managers:", err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchManagers()
  }, [])

  return { managers, loading, error }
}

export default useManagers
