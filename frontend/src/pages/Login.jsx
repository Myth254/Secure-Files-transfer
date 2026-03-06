import React from "react";
import { Login as LoginComponent } from "../components/auth";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <LoginComponent />
      </div>
    </div>
  );
};

export default LoginPage;
