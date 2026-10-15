import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/auth/check");
      console.log(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Authentication failed");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/login", credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Login failed");
    }
  }
);
export const exchangeOAuthToken = createAsyncThunk(
  "auth/exchangeOAuthToken",
  async (token, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/exchange-token", {
        token: token
      });
      console.log("Token exchange response:", response.data);
      return response.data;
    } catch (error) {
      console.log(error);
      return rejectWithValue(error.response?.data || "Token exchange failed");
    }
  }
);


export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/register", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Registration failed");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/logout", userData || {});
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Logout failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    status: "idle",
    checkAuthStatus: "idle",
    tokenExchangeStatus: "idle", 
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      // 🔥 NEW: Manual user set (for Google OAuth)
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearTokenExchangeStatus: (state) => {
      state.tokenExchangeStatus = "idle";
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 🔥 NEW: Check Authentication
      .addCase(checkAuth.pending, (state) => {
        state.checkAuthStatus = "loading";
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.checkAuthStatus = "succeeded";
        if (action.payload.authenticated) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.error = null;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.checkAuthStatus = "failed";
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.success) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.error = null;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // 🔥 NEW: Register User
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.success) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.error = null;
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // 🔥 NEW: Logout User
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = "idle";
        state.error = null;
        localStorage.removeItem("user");
        localStorage.removeItem("authenticated");
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Even if logout API fails, clear local state
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
        localStorage.removeItem("user");
        localStorage.removeItem("authenticated");
      }) .addCase(exchangeOAuthToken.pending, (state) => {
        state.tokenExchangeStatus = "loading";
        state.error = null;
      })
      .addCase(exchangeOAuthToken.fulfilled, (state, action) => {
        state.tokenExchangeStatus = "succeeded";
        if (action.payload.authenticated) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.error = null;
          // Persist to localStorage
          localStorage.setItem("user", JSON.stringify(action.payload.user));
          localStorage.setItem("authenticated", "true");
          console.log("OAuth token exchange successful:", action.payload.user.email);
        } else {
          state.user = null;
          state.isAuthenticated = false;
          state.error = action.payload.message;
          localStorage.removeItem("user");
          localStorage.removeItem("authenticated");
        }
      })
      .addCase(exchangeOAuthToken.rejected, (state, action) => {
        state.tokenExchangeStatus = "failed";
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
        localStorage.removeItem("user");
        localStorage.removeItem("authenticated");
        console.error("OAuth token exchange failed:", action.payload);
      });
  },
});

export const { logout, clearError, setUser,  clearTokenExchangeStatus  } = authSlice.actions;
export default authSlice.reducer;
