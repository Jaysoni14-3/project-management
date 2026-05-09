import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, AlertCircle } from "lucide-react";

import AuthCard from "../components/ui/AuthCard";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";

import { login as loginFn } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

/* Translate any login error into a message the user can act on.
   Specific cases first (DB unreachable, bad credentials, locked
   account); fall back to the parsed kind otherwise. The server's
   error.code is authoritative when present — it's stable, while
   server messages may change wording over time. */
const friendlyLoginError = (err) => {
  const e = parseError(err);

  /* Server-attached codes — exact matches first. */
  if (e.code === "DB_UNAVAILABLE") {
    return {
      title: "Server is starting up",
      body:
        "Our database is currently unreachable. This usually clears in 30–60 seconds. Try again in a moment.",
    };
  }

  /* HTTP-status driven mapping. */
  if (e.kind === "auth" || e.status === 401) {
    return {
      title: "Incorrect email or password",
      body:
        e.message && !/Invalid credentials/i.test(e.message)
          ? e.message
          : "Double-check your email and password and try again.",
    };
  }
  if (e.kind === "validation") {
    return {
      title: "Couldn't sign in",
      body: e.message || "Some details look off. Check the form and try again.",
    };
  }
  if (e.kind === "rate_limit") {
    return {
      title: "Too many attempts",
      body: "You've tried too many times. Wait a minute and try again.",
    };
  }
  if (e.kind === "network") {
    return {
      title: "Can't reach the server",
      body:
        "Check your internet connection. If you're online, the server may be down — try again shortly.",
    };
  }
  if (e.kind === "timeout") {
    return {
      title: "The server took too long",
      body: "Your request timed out. Try again — if it keeps happening, the server may be overloaded.",
    };
  }
  if (e.kind === "server" || (e.status && e.status >= 500)) {
    return {
      title: "Server error",
      body:
        e.message && e.message !== "Internal server error."
          ? e.message
          : "Our server hit an error signing you in. Try again in a moment.",
    };
  }

  return {
    title: "Couldn't sign in",
    body: e.message || "Something went wrong. Try again.",
  };
};

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /* Two-line error: a short title + a longer description. Helps users
     distinguish "wrong password" from "server is down" at a glance. */
  const [formError, setFormError] = useState(null);
  const [requestId, setRequestId] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setRequestId(null);

    if (!email || !password) {
      setFormError({
        title: "Missing details",
        body: "Please enter both your email and password.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await loginFn(email, password);
      // Auth state listener will redirect via the effect above.
    } catch (err) {
      const parsed = parseError(err);
      logger.error("Login.submit", parsed, { email });
      setFormError(friendlyLoginError(err));
      /* Server attaches a request id — surface it so the user can
         quote it in a bug report. */
      setRequestId(parsed?.requestId ?? null);
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
            <div className="min-w-0">
              <p className="text-bodySm font-medium">{formError.title}</p>
              {formError.body && (
                <p className="text-caption text-error-700 mt-[2px]">
                  {formError.body}
                </p>
              )}
              {requestId && (
                <p className="text-caption text-error-700 font-mono mt-[2px]">
                  id {requestId}
                </p>
              )}
            </div>
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
