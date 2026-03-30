import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          // Use a unique storage key to avoid conflicts
          storageKey: 'hiepd5-auth-token',
        },
        global: {
          headers: {
            'X-Client-Info': 'hiepd5-web',
          },
        },
      }
    );
  }
  return browserClient;
}

// Helper to safely clear corrupted sessions
export async function clearCorruptedSession() {
  try {
    // Clear any potentially corrupted localStorage keys
    if (typeof window !== 'undefined') {
      const keysToCheck = Object.keys(localStorage).filter(
        key => key.includes('supabase') || key.includes('hiepd5-auth')
      );
      
      for (const key of keysToCheck) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            JSON.parse(value); // Test if valid JSON
          }
        } catch {
          // Remove corrupted key
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Silent fail
  }
}

// Safe auth getter with error handling
export async function safeGetUser() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      // If session is invalid, try to clear and return null
      if (error.message?.includes('session') || error.message?.includes('token')) {
        await clearCorruptedSession();
      }
      return null;
    }
    
    return data.user;
  } catch {
    return null;
  }
}
