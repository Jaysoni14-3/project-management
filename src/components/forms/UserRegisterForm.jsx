import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Select from "react-select";

import Input from "../ui/Input";
import PasswordInput from "../ui/PasswordInput";
import Button from "../ui/Button";
import selectStyles from "../ui/selectStyles";

import { createUserAccount, updateMyProfile } from "../../services/auth.service";
import { syncUserProjects } from "../../services/employee.service";
import useManagers from "../../hooks/useManagers";
import { useProjects } from "../../hooks/useProjects";

const avatars = ["boy_1.jpeg", "boy_2.jpeg", "boy_3.jpeg"];

const UserForm = ({ user, submitLabel = "Submit", onSuccess }) => {
  const isEdit = Boolean(user);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [managerId, setManagerId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const { managers, loading: loadingManagers } = useManagers();
  const { projects, loading: loadingProjects } = useProjects();

  const projectOptions = useMemo(() => {
    // Dedupe by project id (defensive against any duplicate streaming from
    // the realtime listener) and disambiguate name collisions by appending
    // the client name so two "Motigram" projects don't render identically.
    const nameCount = new Map();
    (projects ?? []).forEach((p) => {
      if (!p?.name) return;
      nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1);
    });

    const seen = new Set();
    return (projects ?? [])
      .filter((p) => {
        if (!p?.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => {
        const collides = (nameCount.get(p.name) || 0) > 1;
        const label = collides && p.clientName
          ? `${p.name} · ${p.clientName}`
          : collides
          ? `${p.name} · ${p.id.slice(0, 6)}`
          : p.name || "Untitled";
        return { value: p.id, label };
      });
  }, [projects]);

  // Reset/prefill on user prop change
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setRole(user.role || "");
      setManagerId(user.managerID || "");
      setWhatsapp(user.whatsapp || "");
      setPhoneNumber(user.phoneNumber || "");
      setJoinedDate(user.joinedDate || "");
      setDesignation(user.designation || "");
      // Dedupe legacy duplicates that may exist in older user docs from
      // the previous arrayUnion/arrayRemove flow (where rename drift could
      // accumulate the same project under different stored names).
      const seenIds = new Set();
      const dedupedAssigned = (user.assignedProjects || []).filter((p) => {
        if (!p?.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });
      setSelectedProjects(
        dedupedAssigned.map((p) => ({ value: p.id, label: p.name }))
      );
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRole("");
      setManagerId("");
      setWhatsapp("");
      setPhoneNumber("");
      setJoinedDate("");
      setDesignation("");
      setSelectedProjects([]);
    }
  }, [user]);

  // The new (canonical) list of {id, name} for assignedProjects
  const buildAssignedProjects = () =>
    selectedProjects.map((opt) => ({ id: opt.value, name: opt.label }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!role || role === "0") {
      toast.error("Please select a role");
      return;
    }
    if (role !== "manager" && !managerId) {
      toast.error("Please select a manager");
      return;
    }

    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    const newAssignedProjects = buildAssignedProjects();

    try {
      setLoading(true);

      if (isEdit) {
        await updateMyProfile(user.id, {
          name,
          role,
          isManager: role === "manager",
          managerID: managerId,
          managerId: managerId || null,
          avatar: randomAvatar,
          whatsapp,
          phoneNumber,
          joinedDate,
          designation,
        });

        // Bi-directional project sync
        await syncUserProjects(
          user.id,
          user.assignedProjects || [],
          newAssignedProjects
        );

        toast.success("User updated");
      } else {
        if (!password) {
          toast.error("Password is required");
          setLoading(false);
          return;
        }

        const { id: newUserId } = await createUserAccount({
          email,
          password,
          profile: {
            name,
            role,
            isManager: role === "manager",
            managerID: managerId,
            avatar: randomAvatar,
            whatsapp,
            phoneNumber,
            joinedDate,
            designation,
          },
        });

        // If projects were chosen at create time, push them through the sync
        if (newAssignedProjects.length > 0) {
          await syncUserProjects(newUserId, [], newAssignedProjects);
        }

        toast.success("User created");
      }

      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-row gap-md mb-lg">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isEdit}
        />
      </div>

      {!isEdit && (
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}

      <div className="flex flex-row gap-md mb-lg">
        <div className="w-full">
          <label className="text-fg-muted text-label mb-xs block">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-control rounded-md border border-line bg-surface px-3 text-body text-fg
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          >
            <option value="0">Select role</option>
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="w-full">
          <label className="text-fg-muted text-label mb-xs block">
            Reports to
          </label>
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="w-full h-control rounded-md border border-line bg-surface px-3 text-body text-fg
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          >
            <option value="">Select manager</option>
            {!loadingManagers &&
              managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Projects assignment — bi-directional with the project doc */}
      <div className="mb-lg">
        <label className="text-fg-muted text-label mb-xs block">
          Assigned projects ({selectedProjects.length})
        </label>
        <Select
          isMulti
          options={projectOptions}
          value={selectedProjects}
          onChange={(opts) => setSelectedProjects(opts || [])}
          isLoading={loadingProjects}
          placeholder="Assign projects to this user…"
          classNamePrefix="react-select"
          styles={selectStyles}
        />
        <p className="text-caption text-fg-subtle mt-xs">
          Adding/removing here updates each project's team automatically.
        </p>
      </div>

      <div className="flex flex-row gap-md mb-lg">
        <Input
          label="Joined date"
          type="date"
          value={joinedDate}
          onChange={(e) => setJoinedDate(e.target.value)}
        />
        <Input
          label="Designation"
          type="text"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
      </div>

      <div className="flex flex-row gap-md mb-lg">
        <Input
          label="WhatsApp"
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <Button type="submit" loading={loading} fullWidth>
        {loading ? "Saving" : submitLabel}
      </Button>
    </form>
  );
};

export default UserForm;
