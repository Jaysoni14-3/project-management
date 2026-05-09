import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
  User,
  Lock,
  LogOut,
  Camera,
  Calendar,
  Check,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

import { useAuth } from "../context/AuthContext";
import useUser from "../hooks/useUser";
import { updateMyProfile, changeMyPassword } from "../services/auth.service";

/* ============================================================
   Avatar set kept aligned with UserRegisterForm so an admin-set
   avatar and a self-selected one share the same vocabulary.
============================================================ */
const AVATARS = ["boy_1.jpeg", "boy_2.jpeg", "boy_3.jpeg"];

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const roleConfig = {
  admin:    { label: "Admin",    chip: "bg-error-50 text-error-700 border-error-200" },
  manager:  { label: "Manager",  chip: "bg-accent-soft text-accent border-accent-200" },
  hr:       { label: "HR",       chip: "bg-warning-50 text-warning-700 border-warning-200" },
  employee: { label: "Employee", chip: "bg-subtle text-fg-muted border-line" },
};

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { user, loading } = useUser(authUser?.uid);

  /* ---------------- Profile form ---------------- */
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatar, setAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  /* ---------------- Password form ---------------- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErr, setPwErr] = useState({});

  /* Hydrate the form once the user doc lands */
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setDesignation(user.designation || "");
    setPhoneNumber(user.phoneNumber || "");
    setWhatsapp(user.whatsapp || "");
    setAvatar(user.avatar || "");
  }, [user]);

  const profileDirty =
    user &&
    (name !== (user.name || "") ||
      designation !== (user.designation || "") ||
      phoneNumber !== (user.phoneNumber || "") ||
      whatsapp !== (user.whatsapp || "") ||
      avatar !== (user.avatar || ""));

  /* ---------------- Save profile ---------------- */
  const handleSaveProfile = async (e) => {
    e?.preventDefault?.();
    if (!authUser?.uid) return;
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    try {
      setSavingProfile(true);
      await updateMyProfile(authUser.uid, {
        name: name.trim(),
        designation: designation.trim(),
        phoneNumber: phoneNumber.trim(),
        whatsapp: whatsapp.trim(),
        avatar,
      });
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  /* ---------------- Change password ---------------- */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!currentPassword) errs.current = "Required";
    if (!newPassword) errs.next = "Required";
    if (newPassword !== confirmPassword) errs.confirm = "Doesn't match";
    setPwErr(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSavingPassword(true);
      await changeMyPassword(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      console.error(err);
      const msg = err?.message || "";
      if (/current password/i.test(msg) || /invalid/i.test(msg)) {
        setPwErr({ current: "Current password is incorrect" });
      } else {
        toast.error(msg || "Couldn't change password");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  /* ---------------- Loading ---------------- */
  if (loading || !user) {
    return (
      <div className="flex flex-col gap-xl">
        <PageHeader title="Settings" description="Manage your profile and account." />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="lg:col-span-8 flex flex-col gap-lg">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const role = (user.role || "employee").toLowerCase();
  const cfg = roleConfig[role] ?? roleConfig.employee;

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader title="Settings" />

      {/* ============= Hero summary ============= */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-lg">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-full bg-accent-soft text-accent
              flex items-center justify-center font-semibold overflow-hidden
              ring-4 ring-surface shadow-sm">
              {avatar ? (
                <img
                  src={`/images/${avatar}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-section">{initials(user.name)}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-xs">
            <div className="flex items-center gap-sm flex-wrap">
              <h2 className="text-section text-fg truncate capitalize">
                {user.name || "Unnamed"}
              </h2>
              <span
                className={`text-caption font-medium px-sm py-[2px] rounded-xs border capitalize ${cfg.chip}`}
              >
                {cfg.label}
              </span>
            </div>
            {user.designation && (
              <p className="text-bodySm text-fg-muted capitalize truncate">
                {user.designation}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-md mt-xs text-caption text-fg-subtle">
              {user.email && (
                <span className="inline-flex items-center gap-xs">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
              )}
              {user.joinedDate && (
                <span className="inline-flex items-center gap-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(user.joinedDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ============= Two-column body ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* === Main column === */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Profile information */}
          <Card
            padded={false}
            header={<h2 className="text-section text-fg">Profile information</h2>}
          >
            <form onSubmit={handleSaveProfile} className="px-lg py-lg flex flex-col gap-md">
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leadingIcon={User}
                placeholder="Jane Doe"
              />
              <Input
                label="Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                leadingIcon={Briefcase}
                placeholder="Senior Designer"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <Input
                  label="Phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  leadingIcon={Phone}
                  placeholder="+1 555 123 4567"
                />
                <Input
                  label="WhatsApp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  leadingIcon={MessageCircle}
                  placeholder="15551234567"
                  helperText="Digits only — used for the wa.me link"
                />
              </div>
              <Input
                label="Email"
                value={user.email || ""}
                disabled
                leadingIcon={Mail}
                helperText="Linked to your sign-in. Contact an admin to change it."
              />

              <div className="flex items-center justify-end gap-sm pt-sm border-t border-line-subtle">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName(user.name || "");
                    setDesignation(user.designation || "");
                    setPhoneNumber(user.phoneNumber || "");
                    setWhatsapp(user.whatsapp || "");
                    setAvatar(user.avatar || "");
                  }}
                  disabled={!profileDirty || savingProfile}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  loading={savingProfile}
                  disabled={!profileDirty || savingProfile}
                >
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change password */}
          <Card
            padded={false}
            header={<h2 className="text-section text-fg">Password</h2>}
          >
            <form onSubmit={handleChangePassword} className="px-lg py-lg flex flex-col gap-md">
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={pwErr.current}
                autoComplete="current-password"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <PasswordInput
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={pwErr.next}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={pwErr.confirm}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-center justify-end pt-sm border-t border-line-subtle">
                <Button
                  type="submit"
                  loading={savingPassword}
                  disabled={savingPassword}
                  leadingIcon={Lock}
                >
                  Change password
                </Button>
              </div>
            </form>
          </Card>

          {/* Sign out */}
          <Card
            padded={false}
            header={
              <>
                <h2 className="text-section text-fg">Sign out</h2>
                <Button
                  variant="secondary"
                  leadingIcon={LogOut}
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </>
            }
          />

        </div>

        {/* === Right rail: avatar picker === */}
        <aside className="lg:col-span-4">
          <Card
            padded={false}
            header={<h2 className="text-section text-fg">Avatar</h2>}
          >
            <div className="px-lg py-lg flex flex-col gap-md">
              {/* Preview */}
              <div className="flex items-center gap-md">
                <div className="h-16 w-16 rounded-full bg-accent-soft text-accent
                  flex items-center justify-center font-semibold overflow-hidden
                  ring-4 ring-surface shadow-sm">
                  {avatar ? (
                    <img
                      src={`/images/${avatar}`}
                      alt="Selected avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials(name || user.name)}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-bodySm text-fg font-medium">
                    {avatar ? "Selected avatar" : "Initials"}
                  </p>
                  <p className="text-caption text-fg-subtle">
                    {avatar
                      ? "Click another below to switch"
                      : "Choose an image, or stick with initials"}
                  </p>
                </div>
              </div>

              {/* Picker */}
              <div className="grid grid-cols-4 gap-sm">
                {/* "No avatar" tile — falls back to initials */}
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  aria-pressed={!avatar}
                  className={`relative h-14 w-14 rounded-full bg-subtle text-fg-muted
                    flex items-center justify-center text-bodySm font-semibold
                    transition-[box-shadow,transform] duration-fast
                    hover:scale-[1.04]
                    ${!avatar ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "border border-line"}`}
                  title="No avatar — use initials"
                >
                  {initials(name || user.name)}
                  {!avatar && (
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-fg flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>

                {AVATARS.map((file) => {
                  const selected = avatar === file;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setAvatar(file)}
                      aria-pressed={selected}
                      className={`relative h-14 w-14 rounded-full overflow-hidden
                        transition-[box-shadow,transform] duration-fast
                        hover:scale-[1.04]
                        ${selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "border border-line"}`}
                      title={file}
                    >
                      <img src={`/images/${file}`} alt="" className="w-full h-full object-cover" />
                      {selected && (
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-fg flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-caption text-fg-subtle inline-flex items-center gap-xs">
                <Camera className="h-3.5 w-3.5" />
                Custom uploads coming soon — for now, pick from the set above.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default ProfileSettings;
