import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

// 1. Define Types & Interfaces
export interface User {
  id: string;
  name?: string;
  surname?: string;
  username?: string;
  userRole: string;
  age?: number;
  email: string;
  group_name?: string;
  avatar_url?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password?: string;
}

const API_URL = import.meta.env.VITE_API_URL

export const loginUser = createAsyncThunk<
  { user: User; access_token: string }, // Return type of the payload creator
  LoginCredentials, // First argument to the payload creator
  { rejectValue: string } // Types for ThunkAPI
>(
  'auth/loginUser',
  async ({ email, username, password }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      if (email) formData.append('email', email);
      if (username) formData.append('username', username);
      if (password) formData.append('password', password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(errorData.message || 'Login failed. Please check your credentials.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data; 
    } catch {
      return rejectWithValue('Network error or server is unreachable.');
    }
  }
);

const savedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!savedUser,
  loading: false,
  error: null,
};

// 4. Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    initializeAuth: (state) => {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');      
      if (user && token) {
        state.user = JSON.parse(user);
        state.token = token;
        state.isAuthenticated = true;
      }
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<{ user: User; access_token: string }>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An unknown error occurred';
      });
  },
});

export const { initializeAuth, logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
