import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { exchangeOAuthToken, clearTokenExchangeStatus } from '../store/slices/authSlice';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  
  const { 
    tokenExchangeStatus, 
    isAuthenticated, 
    error 
  } = useSelector((state) => state.auth);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      console.error('No token found in URL');
      navigate('/login?error=no_token');
      return;
    }

    // Dispatch the token exchange action
    dispatch(exchangeOAuthToken(token));
  }, [token, dispatch, navigate]);

  useEffect(() => {
    // Handle the result of token exchange
    if (tokenExchangeStatus === 'succeeded' && isAuthenticated) {
      // Redirect to chat page on success
      navigate('/chat');
    } else if (tokenExchangeStatus === 'failed') {
      // Redirect to login with error
      navigate(`/auth?error=${encodeURIComponent(error?.message || 'oauth_failed')}`);
      // Clear the error after redirecting
      setTimeout(() => dispatch(clearTokenExchangeStatus()), 1000);
    }
  }, [tokenExchangeStatus, isAuthenticated, error, navigate, dispatch]);

  if (tokenExchangeStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;