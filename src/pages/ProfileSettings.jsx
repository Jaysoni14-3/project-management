import React from 'react'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom';

const ProfileSettings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();


  const handleLogout = async () => {
    console.log("Logout button clicked")

    await logout();

    console.log("Logout completed")

    navigate("/login", {replace: true})
  }

  return (
    <div>
        {/* Logout button  */}
        <Button onClick={handleLogout} className='bg-red-600 w-max py-2 px-4 hover:bg-red-800'>Log Out</Button>
    </div>
  )
}

export default ProfileSettings