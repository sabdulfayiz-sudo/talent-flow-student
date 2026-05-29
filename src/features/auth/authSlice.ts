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
  must_change_password?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  // U2: when true the app forces a "set new password" screen before any
  // other route. Cleared after a successful change.
  mustChangePassword: boolean;
}

export interface SessionPayload {
  user: User;
  access_token: string;
  refresh_token?: string;
  must_change_password?: boolean;
}

const persistSession = (payload: SessionPayload) => {
  localStorage.setItem('token', payload.access_token);
  localStorage.setItem('user', JSON.stringify(payload.user));
  if (payload.refresh_token) {
    localStorage.setItem('refresh_token', payload.refresh_token);
  }
};

export interface LoginCredentials {
  email?: string;
  username?: string;
  password?: string;
}

const API_URL = import.meta.env.VITE_API_URL

export const loginUser = createAsyncThunk<
  SessionPayload, // Return type of the payload creator
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
        return rejectWithValue(
          errorData.detail || errorData.message || 'Login failed. Please check your credentials.',
        );
      }

      const data = (await response.json()) as SessionPayload;
      persistSession(data);
      return data;
    } catch {
      return rejectWithValue('Network error or server is unreachable.');
    }
  }
);

const savedUser = localStorage.getItem('user');
const parsedUser: User | null = savedUser ? JSON.parse(savedUser) : null;

const initialState: AuthState = {
  user: parsedUser,
  token: localStorage.getItem('token'),
  isAuthenticated: !!savedUser,
  loading: false,
  error: null,
  mustChangePassword: Boolean(parsedUser?.must_change_password),
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
        const parsed: User = JSON.parse(user);
        state.user = parsed;
        state.token = token;
        state.isAuthenticated = true;
        state.mustChangePassword = Boolean(parsed.must_change_password);
      }
      state.loading = false;
    },
    // Used by the sign-up flow (U3) and any non-thunk auth entry point.
    setSession: (state, action: PayloadAction<SessionPayload>) => {
      persistSession(action.payload);
      state.user = action.payload.user;
      state.token = action.payload.access_token;
      state.isAuthenticated = true;
      state.error = null;
      state.mustChangePassword = Boolean(action.payload.must_change_password);
    },
    // U2: clear the forced-password-change flag after a successful change.
    clearMustChangePassword: (state) => {
      state.mustChangePassword = false;
      if (state.user) {
        state.user = { ...state.user, must_change_password: false };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.mustChangePassword = false;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
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
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<SessionPayload>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.mustChangePassword = Boolean(action.payload.must_change_password);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An unknown error occurred';
      });
  },
});

export const {
  initializeAuth,
  logout,
  clearError,
  updateUser,
  setSession,
  clearMustChangePassword,
} = authSlice.actions;
export default authSlice.reducer;
