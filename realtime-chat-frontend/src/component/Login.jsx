import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser, clearError } from "../store/slices/authSlice";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status, error, isAuthenticated } = useSelector((state) => state.auth);

  const [isRegister, setIsRegister] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: ""
  });

  // Clear errors when switching between login/register
  useEffect(() => {
    dispatch(clearError());
  }, [isRegister, dispatch]);

  // Handle successful authentication and redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to chat room after successful login/register
      navigate('/chat');
    }
  }, [isAuthenticated, user, navigate]);

  // Handle successful registration
  useEffect(() => {
    if (status === "succeeded" && isRegister && user) {
      setAlertMessage(`Welcome ${user.username}! Registration successful and you're now logged in.`);
      setAlertType("success");
      setShowAlert(true);

      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, isRegister, user]);

  // Handle login/register errors
  useEffect(() => {
    if (status === "failed" && error) {
      setAlertMessage(error.message || error);
      setAlertType("error");
      setShowAlert(true);

      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, error]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    if (formData.username.trim() && formData.password.trim()) {
      try {
        await dispatch(loginUser({ 
          username: formData.username, 
          password: formData.password 
        })).unwrap();
        // Navigation will be handled by the useEffect above
      } catch (error) {
        // Error is already handled by the error useEffect
        console.error('Login failed:', error);
      }
    } else {
      setAlertMessage("Please enter both username and password");
      setAlertType("error");
      setShowAlert(true);
    }
  };

  const handleRegister = async () => {
    if (formData.username.trim() && formData.email.trim() && formData.password.trim() && formData.fullName.trim()) {
      try {
        await dispatch(registerUser(formData)).unwrap();
        // Navigation will be handled by the useEffect above
      } catch (error) {
        // Error is already handled by the error useEffect
        console.error('Registration failed:', error);
      }
    } else {
      setAlertMessage("Please fill all required fields");
      setAlertType("error");
      setShowAlert(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  // Google OAuth2 Login
  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:9090";
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const switchToRegister = () => {
    setIsRegister(true);
    setFormData({
      username: "",
      email: "",
      password: "",
      fullName: ""
    });
    dispatch(clearError());
  };

  const switchToLogin = () => {
    setIsRegister(false);
    setFormData({
      username: "",
      password: "",
      email: "",
      fullName: ""
    });
    dispatch(clearError());
  };

  // Rest of your JSX remains the same...
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-pink-200 to-purple-200 overflow-hidden font-sans px-4 py-8">

      {/* Success/Error Alert - Top Right Corner */}
      {showAlert && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm ${
          alertType === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        } rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${
              alertType === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {alertType === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                alertType === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {alertMessage}
              </p>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className={`ml-auto flex-shrink-0 ${
                alertType === 'success' 
                  ? 'text-green-400 hover:text-green-600' 
                  : 'text-red-400 hover:text-red-600'
              } transition-colors`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bubbles */}
      <div className="bubble absolute w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-purple-300 top-5 left-4 sm:top-10 sm:left-5 md:left-10 rounded-full opacity-20 animate-float"></div>
      <div className="bubble absolute w-24 h-24 sm:w-28 sm:h-28 md:w-40 md:h-40 bg-pink-300 top-40 right-4 sm:top-48 sm:right-5 md:right-20 rounded-full opacity-20 animate-float animation-delay-5000"></div>
      <div className="bubble absolute w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-blue-300 bottom-8 left-1/4 sm:bottom-10 sm:left-1/3 rounded-full opacity-20 animate-float animation-delay-10000"></div>

      {/* Card Container */}
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl h-auto min-h-[500px] sm:min-h-[550px] md:min-h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-white card transition-all duration-700 flex flex-col">

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Login Panel */}
          <div
            className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-center transition-transform duration-700 ease-in-out panel ${
              isRegister ? "translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100 pointer-events-auto"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 text-gray-800 text-center sm:text-left">
              Welcome Back
            </h2>
            <p className="text-gray-500 mb-4 sm:mb-5 md:mb-6 text-sm sm:text-base text-center sm:text-left">
              Login to your account
            </p>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors mb-4"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5" 
              />
              Continue with Google
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with username</span>
              </div>
            </div>
            
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />
            
            <button
              onClick={handleLogin}
              disabled={status === "loading"}
              className="w-full py-2 sm:py-2.5 md:py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              {status === "loading" && !isRegister ? "Logging in..." : "Login"}
            </button>
            
            <p className="mt-4 sm:mt-5 md:mt-6 text-gray-500 text-center text-xs sm:text-sm md:text-base">
              Don't have an account?{" "}
              <span
                className="text-purple-500 cursor-pointer font-semibold hover:text-purple-600 transition-colors"
                onClick={switchToRegister}
              >
                Register
              </span>
            </p>
          </div>

          {/* Register Panel */}
          <div
            className={`absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-center transition-transform duration-700 ease-in-out panel ${
              isRegister ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 text-gray-800 text-center sm:text-left">
              Create Account
            </h2>
            <p className="text-gray-500 mb-4 sm:mb-5 md:mb-6 text-sm sm:text-base text-center sm:text-left">
              Sign up for free
            </p>
            
            <input
              type="text"
              name="fullName"
              placeholder="Full Name *"
              value={formData.fullName}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />
            
            <input
              type="text"
              name="username"
              placeholder="Username *"
              value={formData.username}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />
            
            <input
              type="email"
              name="email"
              placeholder="Email *"
              value={formData.email}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />
            
            <input
              type="password"
              name="password"
              placeholder="Password *"
              value={formData.password}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 mb-3 sm:mb-4 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 transition-all text-sm sm:text-base"
            />
            
            <button 
              onClick={handleRegister}
              disabled={status === "loading"}
              className="w-full py-2 sm:py-2.5 md:py-3 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              {status === "loading" && isRegister ? "Creating Account..." : "Register & Login"}
            </button>
            
            <p className="mt-4 sm:mt-5 md:mt-6 text-gray-500 text-center text-xs sm:text-sm md:text-base">
              Already have an account?{" "}
              <span
                className="text-pink-500 cursor-pointer font-semibold hover:text-pink-600 transition-colors"
                onClick={switchToLogin}
              >
                Login
              </span>
            </p>
          </div>
        </div>

        {/* Professional Footer with Name */}
        <div className="border-t border-gray-100 mt-auto">
          <div className="py-3 sm:py-4 px-4 sm:px-6 text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors duration-300">
              <span className="text-xs sm:text-sm font-light tracking-wide">
                Crafted 
              </span>
              <span className="text-xs sm:text-sm font-light tracking-wide">
                by
              </span>
              <span className="text-purple-600 font-medium text-sm sm:text-base tracking-tight">
                Sneha
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tailwind Custom Styles */}
      <style>
        {`
          .card:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
          }
          
          @keyframes float { 
            0% { transform: translate(0,0) rotate(0deg); } 
            33% { transform: translate(30px,-30px) rotate(120deg); } 
            66% { transform: translate(-20px,20px) rotate(240deg); } 
            100% { transform: translate(0,0) rotate(360deg); } 
          }
          
          .animate-float { 
            animation: float 25s ease-in-out infinite; 
          }
          
          .animation-delay-5000 { 
            animation-delay: 5s; 
          }
          
          .animation-delay-10000 { 
            animation-delay: 10s; 
          }

          /* Better placeholder styling */
          input::placeholder {
            color: #9CA3AF;
            opacity: 1;
          }

          input::-webkit-input-placeholder {
            color: #9CA3AF;
          }

          input::-moz-placeholder {
            color: #9CA3AF;
            opacity: 1;
          }

          input:-ms-input-placeholder {
            color: #9CA3AF;
          }

          /* Mobile-first responsive improvements */
          @media (max-width: 640px) {
            .card {
              margin: 1rem;
            }
          }

          @media (max-width: 480px) {
            .card {
              border-radius: 1.5rem;
            }
            
            input {
              font-size: 16px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Login;