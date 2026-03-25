"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    console.log("[v0] Login page - useEffect started");
    
    const checkUser = async () => {
      console.log("[v0] Login page - checkUser called");
      const supabase = createClient();
      
      // First try getSession (faster, uses cookies)
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("[v0] Login page - getSession result:", { 
        hasSession: !!sessionData.session,
        userEmail: sessionData.session?.user?.email 
      });
      
      // Then try getUser (more reliable, validates with server)
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("[v0] Login page - getUser result:", { 
        hasUser: !!user, 
        email: user?.email,
        error: error?.message 
      });
      
      if (user) {
        console.log("[v0] Login page - User already logged in, redirecting to home");
        router.push("/");
        return;
      }
      console.log("[v0] Login page - No user found, showing login form");
      setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Use current origin for redirect (works in both dev and prod)
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log("[v0] Login - Redirect URL:", redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.log("[v0] Login - OAuth error:", error);
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.log("[v0] Login - Exception:", err);
      setError("Đã xảy ra lỗi không mong muốn");
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] p-4 flex justify-center items-center bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.4)]"
          >
            <Image
              src="/icon.ico"
              alt="HIEPD5 Logo"
              width={44}
              height={44}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic leading-none">
              HIEPD5.COM
            </h1>
            <p className="text-[8px] md:text-[9px] text-[#666] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">
              Scientific Prompt Architect
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="bg-gradient-to-b from-[#0A0A0A] to-[#080808] border border-[#1A1A1A] rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#F27D26]/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Welcome text */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F27D26] to-[#F27D26]/60 flex items-center justify-center shadow-[0_0_40px_rgba(242,125,38,0.3)]"
                >
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-3 text-balance">
                  Chào mừng bạn
                </h2>
                <p className="text-sm text-[#888]">
                  Đăng nhập để trải nghiệm đầy đủ tính năng
                </p>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Google Login Button */}
              <motion.button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 bg-white text-[#1a1a1a] font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-gray-300 border-t-[#F27D26] rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="text-base">
                  {isLoading ? "Đang đăng nhập..." : "Tiếp tục với Google"}
                </span>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent" />
                <span className="text-xs text-[#666] uppercase tracking-wider">Bảo mật</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-transparent" />
              </div>

              {/* Security info */}
              <div className="flex items-center justify-center gap-2 text-[#666]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Đăng nhập an toàn với Google OAuth 2.0</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center mt-6 text-xs text-[#666] px-4">
            Bằng việc đăng nhập, bạn đồng ý với{" "}
            <a href="/terms" className="text-[#F27D26] hover:underline">
              Điều khoản dịch vụ
            </a>{" "}
            và{" "}
            <a href="/privacy" className="text-[#F27D26] hover:underline">
              Chính sách bảo mật
            </a>
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-[#1A1A1A]">
        <div className="text-center opacity-30">
          <p className="text-[8px] uppercase tracking-[0.3em]">
            © 2026 HIEPD5.COM - Scientific Workflow
          </p>
        </div>
      </footer>
    </div>
  );
}
