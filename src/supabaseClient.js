import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingConfigError = {
  message: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Replit Secrets.',
  code: 'SUPABASE_CONFIG_MISSING',
};

function createUnavailableQuery() {
  const response = { data: null, error: missingConfigError, count: 0 };
  let proxy;

  proxy = new Proxy(function unavailableQuery() {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected) => Promise.resolve(response).catch(onRejected);
      }
      if (prop === 'finally') {
        return (onFinally) => Promise.resolve(response).finally(onFinally);
      }
      return () => proxy;
    },
  });

  return proxy;
}

function createUnavailableClient() {
  return {
    from: () => createUnavailableQuery(),
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: () => {},
    storage: {
      createBucket: async () => ({ data: null, error: missingConfigError }),
      from: () => ({
        upload: async () => ({ data: null, error: missingConfigError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: missingConfigError }),
      signUp: async () => ({ data: { user: null, session: null }, error: missingConfigError }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
    },
  };
}

export const supabaseConfigError = supabaseUrl && supabaseAnonKey ? null : missingConfigError;

export const supabase = supabaseConfigError
  ? createUnavailableClient()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: window.sessionStorage,
        storageKey: 'shelfmaster-session',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
