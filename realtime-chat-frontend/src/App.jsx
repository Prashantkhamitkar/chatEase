// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import './App.css';

// Components
import ChatRoom from './component/ChatRoom';
import ProtectedRoute from './component/ProtectedRoute';
import PublicRoute from './component/PublicRoute';
import Login from './component/Login';
import { checkAuth } from './store/slices/authSlice';
import OAuthCallback from './component/OAuthCallback';

// Create a wrapper component that uses useLocation INSIDE Router
function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { checkAuthStatus } = useSelector((state) => state.auth);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);

  // Check authentication status on app load, but skip for OAuth callback
  useEffect(() => {
    // Don't check auth if we're on the OAuth callback route
    if (location.pathname !== '/oauth/callback') {
      dispatch(checkAuth()).finally(() => {
        setInitialAuthCheckDone(true);
      });
    } else {
      // If we're on OAuth callback, mark as done immediately
      setInitialAuthCheckDone(true);
    }
  }, [dispatch, location.pathname]);

  // Show loading while checking initial authentication (but not for OAuth callback)
  if (checkAuthStatus === 'loading' && !initialAuthCheckDone && location.pathname !== '/oauth/callback') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - only accessible when not authenticated */}
      <Route 
        path="/auth"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* OAuth callback - no auth protection needed */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      
      {/* Protected route - only accessible when authenticated */}
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        } 
      />
      
      {/* Default route */}
      <Route path="/" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      
      {/* Catch all route */}
      <Route path="*" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;