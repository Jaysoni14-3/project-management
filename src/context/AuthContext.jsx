import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "react-toastify"
import {
  onAuthChange,
  logout as logoutFn,
  stopImpersonating as stopImpersonatingFn,
} from "../services/auth.service"
import { onSessionExpired } from "../services/apiClient"
import logger from "../lib/logger"

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

  /* Global session-expired listener: any 401 from apiClient fires this
     event. We clear local auth state and redirect to /login. The
     apiClient debounces multiple 401s within a short window so this
     fires at most once per real expiry. */
  useEffect(() => {
    const unsub = onSessionExpired(() => {
      logger.warn("AuthContext", "session expired")
      setUser(null)
      setRole(null)
      setImpersonatedBy(null)
      if (typeof window !== "undefined") {
        const here = window.location.pathname + window.location.search
        if (!here.startsWith("/login")) {
          toast.info("Your session expired. Please sign in again.")
          window.location.assign("/login")
        }
      }
    })
    return unsub
  }, [])

  const logout = async () => {
    try {
      await logoutFn()
      setUser(null)
      setRole(null)
      setImpersonatedBy(null)
    } catch (error) {
      logger.error("AuthContext.logout", error)
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
      logger.error("AuthContext.stopImpersonating", error)
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
