import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthErrorContent from "@/components/auth-error-content";

export default function AuthErrorPage() {
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
        <Suspense
          fallback={
            <div className="w-full max-w-md text-center bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 shadow-2xl">
              <div className="h-4 bg-[#1A1A1A] rounded animate-pulse" />
            </div>
          }
        >
          <AuthErrorContent />
        </Suspense>
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
