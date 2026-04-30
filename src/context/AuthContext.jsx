import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../services/firebase"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }
  
      try {
        const userRef = doc(db, "users", firebaseUser.uid)
        const userSnap = await getDoc(userRef)
  
        setUser(firebaseUser)
        setRole(userSnap.exists() ? userSnap.data().role : null)
      } catch (error) {
        console.error("AuthContext Firestore error:", error)
  
        // Still allow login even if role fetch fails
        setUser(firebaseUser)
        setRole(null)
      } finally {
        setLoading(false)
      }
    })
  
    return unsubscribe
  }, [])

  const logout = async () => {
    try {
      console.log("Signing out...")
      await signOut(auth)
      console.log("Signed out")
  
      setUser(null)
      setRole(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }
  
  
  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
