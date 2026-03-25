"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Coins, Crown, LogOut } from "lucide-react";
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
  const pathname = usePathname();
  const router = useRouter();

  // Don't show header on login page
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const supabase = createClient();
    
    const fetchProfile = async (userId: string, userEmail?: string, userMetadata?: Record<string, unknown>) => {
      console.log("[v0] Header - Fetching profile for user:", userId);
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits, role, email, full_name, avatar_url")
        .eq("id", userId)
        .single();

      console.log("[v0] Header - Profile data:", profile);
      console.log("[v0] Header - Profile error:", error);

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
      console.log("[v0] Header - Initializing auth...");
      
      // Use getUser() instead of getSession() for more reliable auth check
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      console.log("[v0] Header - getUser result:", currentUser?.email || "none", "Error:", error?.message || "none");
      
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
        console.log("[v0] Header - Auth event:", event);
        
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

  // Don't render on login page
  if (isLoginPage) return null;

  // Don't render anything if still loading
  if (isLoading) {
    return (
      <header className="fixed top-0 right-0 z-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-[#1A1A1A] rounded-full animate-pulse border border-[#2A2A2A]" />
          <div className="w-9 h-9 bg-[#1A1A1A] rounded-full animate-pulse border-2 border-[#2A2A2A]" />
        </div>
      </header>
    );
  }

  // Don't render if no user
  if (!user) return null;

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
