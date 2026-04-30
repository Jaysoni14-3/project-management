import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore"

import Input from "../ui/Input"
import PasswordInput from "../ui/PasswordInput"
import Button from "../ui/Button"

import { auth, db } from "../../services/firebase"
import useManagers from "../../hooks/useManagers"

const avatars = ["boy_1.jpeg", "boy_2.jpeg", "boy_3.jpeg"]

const UserForm = ({ user, submitLabel = "Submit", onSuccess }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");
    const [managerId, setManagerId] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [joinedDate, setJoinedDate] = useState("");
    const [designation, setDesignation] = useState("");
    const [assignedProjects, setAssignedProjects] = useState([]);
    
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (user) {
            setName(user.name || "")
            setEmail(user.email || "")
            setRole(user.role || "")
            setManagerId(user.managerID || "")
            setWhatsapp(user.whatsapp || "")
            setPhoneNumber(user.phoneNumber || "")
            setJoinedDate(user.joinedDate || "")
            setDesignation(user.designation || "")
            setAssignedProjects(user.assignedProjects || "")
        } else {
            // reset form when switching back to Add mode
            setName("")
            setEmail("")
            setRole("")
            setManagerId("")
            setPassword("")
            setWhatsapp("")
            setPhoneNumber("")
            setJoinedDate("")
            setDesignation("")
            setAssignedProjects([]);
        }

    }, [user])

    const { managers, loading: loadingManagers } = useManagers()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading) return

        if (!role || role === "0") {
            toast.error("Please select a role")
            return
        }

        if (role !== "manager" && !managerId) {
            toast.error("Please select a manager")
            return
        }

        const randomAvatar =
            avatars[Math.floor(Math.random() * avatars.length)]

        try {
            setLoading(true)

            // Update user if USER found 
            if (user) {
                await updateDoc(doc(db, "users", user.id), {
                    name,
                    email,
                    role,
                    isManager: role === "manager",
                    managerID: managerId,
                    avatar: randomAvatar,
                    whatsapp: whatsapp,
                    phoneNumber: phoneNumber,
                    joinedDate: joinedDate,
                    designation: designation,
                    assignedProjects: assignedProjects,
                    updatedAt: serverTimestamp(),
                  })
                  toast.success("User updated")
            }else {
                if (!password) {
                    toast.error("Password is required")
                    setLoading(false)
                    return
                }

                const cred = await createUserWithEmailAndPassword(auth, email, password)
                const user = cred.user
    
                await setDoc(doc(db, "users", user.uid), {
                    name,
                    email,
                    role,
                    isManager: role === "manager",
                    managerID: managerId,
                    avatar: randomAvatar,
                    whatsapp: whatsapp,
                    phoneNumber: phoneNumber,
                    joinedDate: joinedDate,
                    designation: designation,
                    assignedProjects: [],
                    createdAt: serverTimestamp(),
                })
    
                toast.success("User created")
            }
            onSuccess?.()

        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="">
            <div className="flex flex-row gap-2 mb-lg">
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <div className="flex flex-row gap-2 mb-lg">
                <div className="w-full">
                    <label className="text-text-secondary text-label mb-xs">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full h-10 rounded-md border px-3"
                    >
                        <option value="0">Select Role</option>
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                    </select>
                </div>

                <div className="w-full">
                    <label className="text-text-secondary text-label mb-xs">
                        Select Manager
                    </label>
                    <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="w-full h-10 rounded-md border px-3"
                    >
                        <option value="">Select Manager</option>
                        {!loadingManagers &&
                            managers.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-row gap-2 mb-lg">
                <div className="w-full">
                    <Input label="Joined Date" type="date" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} />
                </div>
                <div className="w-full">
                    <Input label="Designation" type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                </div>

            </div>

            <div className="flex align-center justify-between gap-2 mb-lg">
                <Input label="Whatsapp" type="number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <Input label="Phone" type="number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>

        
            <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : submitLabel}
            </Button>
        </form>
    )
}

export default UserForm
