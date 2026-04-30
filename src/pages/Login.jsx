import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/ui/AuthCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PasswordInput from '../components/ui/PasswordInput';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Bounce, toast, ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const loginAttemptRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in or after successful login
  useEffect(() => {
    if (!authLoading && user) {
      loginAttemptRef.current = false;
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleLogin(e){
    e?.preventDefault();
    
    if (isLoading) return; // Prevent double submission
    
    setIsLoading(true);
    loginAttemptRef.current = true;
    
    try{
      await signInWithEmailAndPassword(auth, email, password)
      // Don't navigate here - let useEffect handle it once auth state updates
      // The auth state change will trigger the useEffect above
      toast("Logged in Successfully")
    }catch(err){
      setIsLoading(false);
      loginAttemptRef.current = false;
      toast("Error logging in")
      console.log(err.message)
    }
  }

  return (
    <>
      <div className='max-w-[350px] w-full'>
        <AuthCard title="Login">
          <form onSubmit={handleLogin}>
            <div className="mb-lg">
              <Input label='Email' value={email} onChange={(e)=> setEmail(e.target.value)} id="email" type='email' placeholder="you@example.com" disabled={isLoading} />
            </div>
            <div className="mb-lg">
              <PasswordInput label='Password' value={password} onChange={(e)=> setPassword(e.target.value)} id="password" type='password' placeholder="*****" disabled={isLoading} />
            </div>
            <Button type="submit" className="mt-lg" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</Button>
          </form>
        </AuthCard>

        <p className="text-text-secondary text-body text-center mt-md">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-accent hover:text-accent-hover"
          >
            Register
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

export default Login