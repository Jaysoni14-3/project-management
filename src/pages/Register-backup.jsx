import React, { useState } from 'react'
import { Bounce, ToastContainer } from 'react-toastify';
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthCard from '../components/ui/AuthCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PasswordInput from '../components/ui/PasswordInput';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../services/firebase';
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import useManagers from '../hooks/useManagers';

const avatars = [
  { label: "Avatar 1", value: "boy_1.jpeg", image: "/images/boy_1.jpeg" },
  { label: "Avatar 2", value: "boy_2.jpeg", image: "/images/boy_2.jpeg" },
  { label: "Avatar 3", value: "boy_3.jpeg", image: "/images/boy_3.jpeg" },
]


const Register = () => {
  const navigate = useNavigate();

  const [registrationError, setRegistrationError] = useState("");

  const [registrationName, setRegistrationName] = useState("");
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [registrationRole, setRegistrationRole] = useState("");

  // const [registrationManagerName, setRegistrationManagerName] = useState("");
  const [selectedManager, setSelectedManager] = useState("");

  const { managers, loading: loadingManagers } = useManagers()


  async function handleRegistration() {
    setRegistrationError("");

    if (!registrationRole || registrationRole === "0") {
      setRegistrationError("Please select a role");
      return;
    }
  
    if (registrationRole !== "manager" && !selectedManager) {
      setRegistrationError("Please select a manager");
      return;
    }

    const randomIndex = Math.floor(Math.random() * avatars.length);
    const randomAvatar = avatars[randomIndex].value; // store filename only

    // Calculate isManager based on role - if role is 'manager', set isManager to true
    const isManagerValue = registrationRole === 'manager';

    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, registrationEmail, registrationPassword);

      const user = userCredentials.user;

      try {
        await setDoc(doc(db, "users", user.uid), {
          name: registrationName,
          email: user.email,
          managerID: selectedManager,
          role: registrationRole,
          isManager: isManagerValue,
          avatar: randomAvatar, 
          createdAt: serverTimestamp(),
        });

      } catch (err) {
        console.error("Firestore error:", err);
      }

      navigate("/");

    } catch (err) {
      setRegistrationError(err.message);
      console.log(registrationError);
    }

  }



  return (
    <>
      <div className='max-w-[500px] w-full'>
        <AuthCard title="Register your Account">
          <form onSubmit={(e) => { e.preventDefault(); handleRegistration(); }}>

            <div className="flex flex-row gap-sm">
              <Input label="Your Name" value={registrationName} onChange={(e) => setRegistrationName(e.target.value)} id="registration_name" type='text' placeholder="Name" />
              <Input label='Email' value={registrationEmail} onChange={(e) => setRegistrationEmail(e.target.value)} id="registration_email" type='email' placeholder="you@example.com" />
            </div>
            <PasswordInput label="Password" value={registrationPassword} onChange={(e) => setRegistrationPassword(e.target.value)} id="registration_password" placeholder="******" />

            {/* <Input label="Manager" value={registrationManagerName} onChange={(e) => setRegistrationManagerName(e.target.value)} id="registration_manager_name" type='text' placeholder="Your Manager" /> */}

            <div className="flex flex-col mb-lg">
              <label className="text-text-secondary text-label mb-xs">
                Select Manager
              </label>

              <select value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)} className="w-full h-10 rounded-md border border-border px-3 text-body focus:border-accent focus:ring-2 focus:ring-accent-soft">
                <option value="">Select Manager</option>

                {loadingManagers && (
                  <option disabled>Loading managers...</option>
                )}

                {!loadingManagers &&
                  managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col mb-lg">
              <label htmlFor="selectRole" className=" text-text-secondary text-label mb-xs">Select Role</label>
              <select className='w-full h-10 rounded-md border border-border px-3 text-body focus:border-accent focus:ring-2 focus:ring-accent-soft outline-none' value={registrationRole} onChange={(e) => { setRegistrationRole(e.target.value) }} name="selectRole" id="selectRole">
                <option value="0">Select Role</option>
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <Button type="submit" className="mt-lg">Register</Button>

          </form>
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