import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { FiMail, FiClock, FiRefreshCw } from "react-icons/fi";
import LoadingSpinner from "../common/LoadingSpinner";

const OTPVerification = () => {
  const { otpData, verifyOTP, resendOTP, loading } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!otpData) {
      navigate("/login");
    }
  }, [otpData, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) return; // Prevent pasting multiple digits

    const newOtp = [...otp];
    newOtp[index] = value.replace(/[^0-9]/g, "");
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, 6);
    const digits = pastedData.replace(/[^0-9]/g, "").split("");

    const newOtp = [...otp];
    digits.forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtp(newOtp);

    // Focus the next empty input or last input
    const nextEmptyIndex = newOtp.findIndex((d) => !d);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    const result = await verifyOTP(otpCode);

    if (!result.success) {
      setError(result.error);
    }
  };

  const handleResend = async () => {
    const result = await resendOTP();
    if (result.success) {
      setTimer(600);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  if (!otpData) return null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-4">
          <FiMail className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Verify Your Email
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We've sent a 6-digit code to your email. Enter it below to continue.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {otpData?.email}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center space-x-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <FiClock className="h-4 w-4 mr-1" />
            <span>{formatTime(timer)}</span>
          </div>

          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <FiRefreshCw className="h-4 w-4 mr-1" />
              Resend Code
            </button>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">
              Resend in {formatTime(timer)}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || otp.some((d) => !d)}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="white" />
          ) : (
            "Verify & Continue"
          )}
        </button>
      </form>
    </div>
  );
};

export default OTPVerification;
