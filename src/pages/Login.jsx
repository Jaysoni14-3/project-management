import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, AlertCircle } from "lucide-react";

import AuthCard from "../components/ui/AuthCard";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";

import { login as loginFn } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

const friendlyAuthError = (code) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password you entered is incorrect.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your admin.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "We couldn't reach the server. Check your connection.";
    default:
      return "Something went wrong signing in. Please try again.";
  }
};

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError("");

    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await loginFn(email, password);
      // Auth state listener will redirect via the effect above.
    } catch (err) {
      setFormError(friendlyAuthError(err?.code) || err?.message || "Sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your EKAIO workspace"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-accent hover:text-accent-hover font-medium transition-colors duration-fast"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="flex gap-sm items-start mb-lg p-md rounded-md
              bg-error-50 border border-error-200 text-error-800 animate-slide-down"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-[2px]" aria-hidden />
            <p className="text-bodySm">{formError}</p>
          </div>
        )}

        <div className="flex flex-col gap-md">
          <Input
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            leadingIcon={Mail}
            autoFocus
          />

          <PasswordInput
            label="Password"
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <Button
          type="submit"
          loading={submitting}
          fullWidth
          className="mt-xl"
        >
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
};

export default Login;
