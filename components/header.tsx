"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Coins, Crown, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  credits: number;
  role: string;
  isPro: boolean;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    const fetchProfile = async (userId: string, userEmail?: string, userMetadata?: Record<string, unknown>) => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits, role, email, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (profile) {
        setUserProfile({
          credits: profile.credits ?? 10,
          role: profile.role ?? "free",
          isPro: profile.role === "pro",
          email: profile.email || userEmail,
          fullName: profile.full_name || (userMetadata?.full_name as string) || (userMetadata?.name as string),
          avatarUrl: profile.avatar_url || (userMetadata?.avatar_url as string) || (userMetadata?.picture as string),
        });
      } else if (error?.code === "PGRST116") {
        // Profile doesn't exist - use metadata from auth
        setUserProfile({
          credits: 10,
          role: "free",
          isPro: false,
          email: userEmail,
          fullName: (userMetadata?.full_name as string) || (userMetadata?.name as string),
          avatarUrl: (userMetadata?.avatar_url as string) || (userMetadata?.picture as string),
        });
      }
      setIsLoading(false);
    };

    const initializeAuth = async () => {
      // Use getUser() instead of getSession() for more reliable auth check
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setUserProfile(null);
          setIsLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Refresh profile data on token refresh
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Don't render anything if still loading
  if (isLoading) {
    return (
      <header className="fixed top-0 right-0 z-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-[#1A1A1A] rounded-full animate-pulse border border-[#2A2A2A]" />
        </div>
      </header>
    );
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Login error:", error);
      setIsLoggingIn(false);
    }
  };

  // Always render - show login button if no user
  if (!user) {
    return (
      <>
        <header className="fixed top-0 right-0 z-50 p-4">
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-2 bg-[#F27D26] text-black font-bold uppercase text-sm rounded-lg hover:bg-[#E26D16] transition-colors"
          >
            Login Google
          </button>
        </header>

        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 max-w-md w-full text-center space-y-6"
              >
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-4 text-[#666] hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="w-20 h-20 mx-auto bg-[#F27D26]/10 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" viewBox="0 0 24 24">
                    <path fill="#F27D26" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#F27D26" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#F27D26" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#F27D26" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                
                <h3 className="text-2xl font-black uppercase">Welcome</h3>
                <p className="text-[#888]">
                  Login with your Google account to download projects and access premium features.
                </p>
                
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#F27D26] text-black font-bold uppercase rounded-xl hover:bg-[#E26D16] transition-colors disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <span>Connecting...</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
                
                <p className="text-xs text-[#666]">
                  By continuing, you agree to our Terms of Service
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-3">
        {/* Credits Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            userProfile?.isPro
              ? "bg-gradient-to-r from-[#F27D26]/20 to-yellow-500/20 border border-[#F27D26]/30 text-[#F27D26]"
              : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#888]"
          }`}
        >
          {userProfile?.isPro ? (
            <>
              <Crown className="w-4 h-4 text-[#F27D26]" />
              <span className="text-[#F27D26]">PRO</span>
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              <span>{userProfile?.credits ?? 10} luot</span>
            </>
          )}
        </div>

        {/* User Avatar with Dropdown */}
        <div className="relative group">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#2A2A2A] hover:border-[#F27D26] transition-colors cursor-pointer">
            {userProfile?.avatarUrl ? (
              <Image
                src={userProfile.avatarUrl}
                alt={userProfile.fullName || "User"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-[#666] text-sm font-bold">
                {(userProfile?.email || user.email)?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 min-w-[200px] shadow-xl">
              <div className="pb-3 border-b border-[#2A2A2A] mb-2">
                <p className="text-[#E4E3E0] font-medium text-sm truncate">
                  {userProfile?.fullName || userProfile?.email || user.email}
                </p>
                <p className="text-[#666] text-xs">
                  {userProfile?.isPro ? "Pro Member" : "Free Account"}
                </p>
              </div>
              
              {!userProfile?.isPro && (
                <Link
                  href="/upgrade"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#F27D26] hover:bg-[#F27D26]/10 transition-colors mb-1"
                >
                  <Crown className="w-4 h-4" />
                  <span>Nang cap Pro</span>
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#888] hover:bg-[#1A1A1A] hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Dang xuat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
