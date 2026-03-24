"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  Settings,
  Crown,
  Zap,
  ImageIcon,
  Clock,
  TrendingUp,
  Star,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "free" | "pro";
  createdAt: string;
}

interface DashboardClientProps {
  user: UserProfile;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isPro = user.role === "pro";

  const stats = [
    {
      label: "Prompts Generated",
      value: isPro ? "Unlimited" : "10/50",
      icon: ImageIcon,
      color: "#F27D26",
    },
    {
      label: "Time Saved",
      value: "4.2 hrs",
      icon: Clock,
      color: "#22C55E",
    },
    {
      label: "Success Rate",
      value: "94%",
      icon: TrendingUp,
      color: "#3B82F6",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] p-4 flex justify-between items-center bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-50">
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

        <div className="flex items-center gap-3">
          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user.fullName}</p>
              <div className="flex items-center gap-1 justify-end">
                {isPro ? (
                  <span className="text-xs text-[#F27D26] flex items-center gap-1">
                    <Crown className="w-3 h-3" /> PRO
                  </span>
                ) : (
                  <span className="text-xs text-[#666]">Free Plan</span>
                )}
              </div>
            </div>
            <div className="relative">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-[#1A1A1A]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              {isPro && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F27D26] rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2.5 hover:bg-[#1A1A1A] rounded-full transition-colors text-[#444] hover:text-[#F27D26]"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic mb-2">
            Welcome back, {user.fullName.split(" ")[0]}!
          </h2>
          <p className="text-[#666]">
            {isPro
              ? "You have unlimited access to all features."
              : "Upgrade to Pro to unlock unlimited prompts and premium features."}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className="text-sm text-[#666]">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Upgrade Banner (for free users) */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-[#F27D26]/20 to-[#F27D26]/5 border border-[#F27D26]/30 rounded-2xl p-6 md:p-8 mb-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#F27D26]/20 rounded-xl">
                  <Zap className="w-8 h-8 text-[#F27D26]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Upgrade to Pro</h3>
                  <p className="text-[#666] text-sm">
                    Get unlimited prompts, priority support, and exclusive
                    features.
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 bg-[#F27D26] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#F27D26]/90 transition-all">
                <Crown className="w-5 h-5" />
                Upgrade Now
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/"
              className="flex items-center gap-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 hover:border-[#F27D26]/50 transition-colors group"
            >
              <div className="p-3 bg-[#1A1A1A] rounded-xl group-hover:bg-[#F27D26]/20 transition-colors">
                <ImageIcon className="w-6 h-6 text-[#666] group-hover:text-[#F27D26] transition-colors" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Generate Prompts</h4>
                <p className="text-sm text-[#666]">
                  Create AI-powered prompts from your images
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 hover:border-[#F27D26]/50 transition-colors group"
            >
              <div className="p-3 bg-[#1A1A1A] rounded-xl group-hover:bg-[#F27D26]/20 transition-colors">
                <Settings className="w-6 h-6 text-[#666] group-hover:text-[#F27D26] transition-colors" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Account Settings</h4>
                <p className="text-sm text-[#666]">
                  Manage your profile and preferences
                </p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Pro Features Section */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#F27D26]" />
              Pro Features
            </h3>
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
                  Unlimited prompt generations
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
                  Priority processing queue
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
                  Access to all rendering modes
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
                  Export prompts in multiple formats
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 md:p-8 border-t border-[#1A1A1A] mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 opacity-30">
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em]">
            © 2026 HIEPD5.COM - Scientific Workflow
          </p>
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em]">
            Precision Architecture AI
          </p>
        </div>
      </footer>
    </div>
  );
}
