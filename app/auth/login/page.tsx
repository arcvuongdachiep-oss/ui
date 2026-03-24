"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] p-4 flex justify-between items-center bg-[#0A0A0A]/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.4)]"
          >
            <Image
              src="/icon.ico"
              alt="HIEPD5 Logo"
              width={44}
              height={44}
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
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-[#666]">
                Sign in to access your dashboard
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
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
              <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
            </button>

            <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
              <p className="text-center text-xs text-[#666]">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="text-[#F27D26] hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#F27D26] hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-[#666]">
            Don&apos;t have an account?{" "}
            <button
              onClick={handleGoogleLogin}
              className="text-[#F27D26] hover:underline font-medium"
            >
              Sign up with Google
            </button>
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
