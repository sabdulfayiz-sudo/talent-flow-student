import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import I18nProvider from './i18n/Provider';
import './index.css';

// Initialise theme before first paint so the sign-in page (and any
// full-page reload) respects the saved preference without flashing.
const savedTheme = localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system' | null;
const isDark =
  savedTheme === 'dark' ||
  (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('tf-dark', isDark);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These are "senior" defaults to prevent aggressive over-fetching
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 10,    // Keep unused data in cache for 10 minutes
      retry: 1,                 // Only retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch just because the user switched tabs
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
          </I18nProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);