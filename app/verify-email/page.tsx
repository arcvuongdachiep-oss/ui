"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage("");
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      
      if (error) {
        setMessage("Không thể gửi lại email. Vui lòng thử lại sau.");
      } else {
        setMessage("Email xác thực đã được gửi lại!");
      }
    }
    
    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] p-4 flex justify-between items-center bg-[#0A0A0A]/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.4)]">
            <Image
              src="/icon.ico"
              alt="HIEPD5 Logo"
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          </div>
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
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#F27D26]" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
              Xác Thực Email
            </h2>
            <p className="text-sm text-[#666] mb-6">
              Vui lòng kiểm tra hộp thư của bạn và click vào link xác thực để tiếp tục sử dụng dịch vụ.
            </p>

            {message && (
              <p className={`text-sm mb-4 ${message.includes("đã được gửi") ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full flex items-center justify-center gap-2 bg-[#F27D26] text-white font-semibold py-4 px-6 rounded-xl hover:bg-[#F27D26]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isResending ? "animate-spin" : ""}`} />
              {isResending ? "Đang gửi..." : "Gửi lại Email"}
            </button>

            <div className="mt-6 pt-6 border-t border-[#1A1A1A]">
              <p className="text-xs text-[#666]">
                Đã xác thực?{" "}
                <Link href="/" className="text-[#F27D26] hover:underline">
                  Quay lại trang chủ
                </Link>
              </p>
            </div>
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
