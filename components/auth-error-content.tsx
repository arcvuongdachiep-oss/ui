"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "An authentication error occurred";

  return (
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
  );
}
