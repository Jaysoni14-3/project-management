import { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthChange,
  logout as logoutFn,
  stopImpersonating as stopImpersonatingFn,
} from "../services/auth.service"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [impersonatedBy, setImpersonatedBy] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      if (!authUser) {
        setUser(null)
        setRole(null)
        setImpersonatedBy(null)
      } else {
        setUser(authUser)
        setRole(authUser.role ?? null)
        setImpersonatedBy(authUser.impersonatedBy ?? null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const logout = async () => {
    try {
      await logoutFn()
      setUser(null)
      setRole(null)
      setImpersonatedBy(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  /* End an impersonation session and force-reload so every cached
     hook (notifications, projects, dashboards) re-fetches against the
     restored admin session. Simpler and safer than reaching into each
     subscription manually. */
  const stopImpersonating = async () => {
    try {
      await stopImpersonatingFn()
      window.location.assign("/")
    } catch (error) {
      console.error("Stop impersonating error:", error)
    }
  }

  /* Privileged = admin OR manager. Centralised so UI gates and route
     guards stay in sync — adding a new privileged role only changes here. */
  const canManage = role === "admin" || role === "manager"

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        logout,
        canManage,
        impersonatedBy,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
