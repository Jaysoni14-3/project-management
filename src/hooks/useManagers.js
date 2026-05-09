import { useEffect, useState } from "react"
import { getManagers } from "../services/dashboard.service"

const useManagers = () => {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getManagers()
        if (!cancelled) setManagers(list)
      } catch (err) {
        console.error("Error fetching managers:", err)
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { managers, loading, error }
}

export default useManagers
