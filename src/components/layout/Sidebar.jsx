import React, { useState, useEffect } from 'react'
import { BiSolidUser, BiSolidWidget, BiChevronDown, BiChevronUp, BiFolderOpen } from "react-icons/bi";
import { MdDashboard } from "react-icons/md";
import { Link } from 'react-router-dom';
import NavItem from '../ui/NavItem';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useProjects } from '../../hooks/useProjects'


const Sidebar = () => {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [username, setUsername] = useState('');

  const { projects, loading: projectsLoading } = useProjects();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUsername(userData.name || 'User');
          } else {
            setUsername('User');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUsername('User');
        }
      } else {
        setUsername('User');
      }
    });

    return () => unsubscribe();
  }, []);


  return (
    <aside className='h-screen sticky top-0 w-sidebar sidebar bg-accent-gradient shadow-card flex flex-col'>
      
      {/* Header */}
      <div className="border-b border-blue-300 flex flex-col items-center justify-center p-xl">
        {/* <BiSolidWidget className='text-white text-lg' /> */}
        <h2 className='text-white font-bold text-page text-center'>EKAIO</h2>
        <p className="tagline text-white text-sm"> Work, simplified. </p>
      </div>

      {/* Main Nav */}
      <div className="px-xl py-md space-y-md overflow-y-auto flex-1">

        {/* Dashboard */}
        <NavItem
          to="/"
          label="Dashboard"
          icon={MdDashboard}
        />

        {/* Projects Dropdown */}
        <div className="space-y-sm">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full px-md py-sm rounded-sm text-body transition text-gray-200 hover:bg-accent-hover hover:text-white"
          >
            <span className="flex items-center gap-sm">
              <BiFolderOpen />
              Projects
            </span>
            {projectsOpen ? <BiChevronUp /> : <BiChevronDown />}
          </button>

          {projectsOpen && (
            <div className="ml-md flex flex-col gap-sm">
              {projectsLoading && 
              <p className='text-xs text-white' >Loading Projects...</p>
              }
              <NavItem
                to="/projects"
                label="All Projects"
              />
              {projects.map((project) => (
                <>
                <NavItem
                  key={project.id}
                  to={`/projects/${project.id}`}
                  label={project.name}
                  />
                </>
              ))}
            </div>
          )}
        </div>

        {/* Employees */}
        <NavItem
          to="/employees"
          label="Employees"
          icon={BiSolidUser}
        />

      </div>

      {/* User Section */}
      <div className=" border-t border-blue-300 p-xl flex items-center mt-auto gap-md">
        <BiSolidUser className='text-white' />
        <Link to="settings" className='text-white font-bold'>
          {username}
        </Link>
      </div>

    </aside>
  )
}

export default Sidebar
