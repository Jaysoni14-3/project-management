import React from "react";
import { Link } from "react-router-dom";

import AuthCard from "../components/ui/AuthCard";
import UserForm from "../components/forms/UserRegisterForm";

const Register = () => {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Set up your workspace in under a minute"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-accent hover:text-accent-hover font-medium transition-colors duration-fast"
          >
            Sign in
          </Link>
        </>
      }
    >
      <UserForm submitLabel="Create account" />
    </AuthCard>
  );
};

export default Register;
