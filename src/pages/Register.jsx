import React from 'react'
import { Bounce, ToastContainer } from 'react-toastify';
import { Link } from 'react-router-dom'
import AuthCard from '../components/ui/AuthCard';

import UserForm from '../components/forms/UserRegisterForm';

const Register = () => {
  return (
    <>
      <div className='max-w-[500px] w-full'>
        <AuthCard title="Register your Account">
          <UserForm submitLabel="Register" />
        </AuthCard>

        <p className="text-text-secondary text-body text-center mt-md">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-accent hover:text-accent-hover"
          >
            Login
          </Link>
        </p>
        <ToastContainer position="top-right"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          transition={Bounce}
        />
      </div>
    </>
  )
}

export default Register