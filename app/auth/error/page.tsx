"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "An authentication error occurred";

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
          className="w-full max-w-md text-center"
        >
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-[#666] mb-6">{error}</p>

            <Link
              href="/auth/login"
              className="inline-block w-full bg-[#F27D26] text-white font-semibold py-4 px-6 rounded-xl hover:bg-[#F27D26]/90 transition-all"
            >
              Try Again
            </Link>
          </div>
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
