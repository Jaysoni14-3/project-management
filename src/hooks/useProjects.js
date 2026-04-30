import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
// import { getAllProjects } from "../services/project.service";
import { listenToProjects } from "../services/project.service"


export const useProjects = () => {
    const {user, role} = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true)
    


    useEffect(() => {
        if (!user) return
    
        const unsubscribe = listenToProjects(user, role, (data) => {
          setProjects(data)
          setLoading(false)
        })
    
        return () => unsubscribe()
      }, [user, role])
    
      return { projects, loading }


}