import React from "react";
import { OTPVerification } from "../components/auth";

const OTPVerificationPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <OTPVerification />
      </div>
    </div>
  );
};

export default OTPVerificationPage;
