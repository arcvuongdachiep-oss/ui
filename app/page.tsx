"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Coins, Crown, AlertCircle, X, LogOut } from "lucide-react";
import Image from "next/image";
import type { ModeId, PromptResult } from "@/lib/types";
import { ModeSelector, MODES } from "@/components/mode-selector";
import { ImageUploader } from "@/components/image-uploader";
import { ResultsPanel } from "@/components/results-panel";
import { createClient } from "@/lib/supabase/client";
import { 
  optimizeImage, 
  estimateTokens, 
  calculateSavings,
  type OptimizedImage,
  type TokenEstimate 
} from "@/lib/image-optimizer";

const LS_KEY = "hiepd5_user";

interface UserProfile {
  credits: number;
  role: string;
  isPro: boolean;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [optimizedBaseImages, setOptimizedBaseImages] = useState<OptimizedImage[]>([]);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [optimizedRefImage, setOptimizedRefImage] = useState<OptimizedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<PromptResult[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<TokenEstimate | null>(null);
  const [savings, setSavings] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Step 1: If coming from callback with URL params, save to localStorage immediately
  useEffect(() => {
    const uid = searchParams.get("_uid");
    const email = searchParams.get("_email");
    const name = searchParams.get("_name");
    const avatar = searchParams.get("_avatar");

    if (uid && email) {
      // Save basic info from URL params - we know user is authenticated
      const cached = { uid, email, fullName: name || "", avatarUrl: avatar || "", credits: 10, role: "free", isPro: false };
      localStorage.setItem(LS_KEY, JSON.stringify(cached));
      setUserProfile({ credits: 10, role: "free", isPro: false, email, fullName: name || "", avatarUrl: avatar || "" });
      
      // Clean URL params without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("_uid");
      url.searchParams.delete("_email");
      url.searchParams.delete("_name");
      url.searchParams.delete("_avatar");
      window.history.replaceState({}, "", url.toString());

      // Then fetch actual profile from Supabase to get credits
      const supabase = createClient();
      supabase.from("profiles").select("credits, role, email, full_name, avatar_url").eq("id", uid).single()
        .then(({ data: profile }) => {
          if (profile) {
            const updated = { uid, email: profile.email || email, fullName: profile.full_name || name || "", avatarUrl: profile.avatar_url || avatar || "", credits: profile.credits ?? 10, role: profile.role ?? "free", isPro: profile.role === "pro" };
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
            setUserProfile({ credits: updated.credits, role: updated.role, isPro: updated.isPro, email: updated.email, fullName: updated.fullName, avatarUrl: updated.avatarUrl });
          }
        });
      return;
    }

    // Step 2: Try to load from localStorage first (instant display)
    const cached = localStorage.getItem(LS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUserProfile({ credits: parsed.credits ?? 10, role: parsed.role ?? "free", isPro: parsed.isPro ?? false, email: parsed.email, fullName: parsed.fullName, avatarUrl: parsed.avatarUrl });
        
        // Refresh credits from Supabase in background
        const supabase = createClient();
        supabase.from("profiles").select("credits, role, email, full_name, avatar_url").eq("id", parsed.uid).single()
          .then(({ data: profile }) => {
            if (profile) {
              const updated = { ...parsed, email: profile.email || parsed.email, fullName: profile.full_name || parsed.fullName, avatarUrl: profile.avatar_url || parsed.avatarUrl, credits: profile.credits ?? parsed.credits, role: profile.role ?? parsed.role, isPro: profile.role === "pro" };
              localStorage.setItem(LS_KEY, JSON.stringify(updated));
              setUserProfile({ credits: updated.credits, role: updated.role, isPro: updated.isPro, email: updated.email, fullName: updated.fullName, avatarUrl: updated.avatarUrl });
            }
          });
        return;
      } catch {
        localStorage.removeItem(LS_KEY);
      }
    }

    // Step 3: No cache - redirect to login
    router.push("/login");
  }, [router, searchParams]);

  // Calculate token estimate when images change
  useEffect(() => {
    if (optimizedBaseImages.length === 0 && !optimizedRefImage) {
      setTokenEstimate(null);
      setSavings(0);
      return;
    }

    const allOptimized = [
      ...optimizedBaseImages,
      ...(optimizedRefImage ? [optimizedRefImage] : [])
    ];

    // Base prompt text (approximate)
    const basePromptLength = 2000; // System instruction + mode config
    const estimate = estimateTokens(allOptimized, "x".repeat(basePromptLength));
    setTokenEstimate(estimate);

    // Calculate savings
    const totalOriginal = allOptimized.reduce((sum, img) => sum + img.originalSize, 0);
    const totalOptimized = allOptimized.reduce((sum, img) => sum + img.optimizedSize, 0);
    setSavings(calculateSavings(totalOriginal, totalOptimized));
  }, [optimizedBaseImages, optimizedRefImage]);

  const handleBaseUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const remainingSlots = 4 - baseImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    setIsOptimizing(true);

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onloadend = async (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          try {
            const optimized = await optimizeImage(dataUrl);
            setBaseImages((prev) => [...prev, optimized.dataUrl]);
            setOptimizedBaseImages((prev) => [...prev, optimized]);
          } catch (error) {
            console.error("Failed to optimize image:", error);
            // Fallback to original
            setBaseImages((prev) => [...prev, dataUrl]);
          }
        }
      };
      reader.readAsDataURL(file);
    }

    // Small delay to ensure all images are processed
    setTimeout(() => setIsOptimizing(false), 500);
  }, [baseImages.length]);

  const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsOptimizing(true);
      const reader = new FileReader();
      reader.onloadend = async (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          try {
            const optimized = await optimizeImage(dataUrl);
            setRefImage(optimized.dataUrl);
            setOptimizedRefImage(optimized);
          } catch (error) {
            console.error("Failed to optimize image:", error);
            setRefImage(dataUrl);
          }
          setIsOptimizing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeBaseImage = (index: number) => {
    setBaseImages((prev) => prev.filter((_, i) => i !== index));
    setOptimizedBaseImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeRefImage = () => {
    setRefImage(null);
    setOptimizedRefImage(null);
  };

  const generatePrompts = async () => {
    if (!selectedMode || optimizedBaseImages.length === 0 || !optimizedRefImage) return;

    const imageCount = optimizedBaseImages.length;

    // Check credits before generating (for non-Pro users)
    if (userProfile && !userProfile.isPro && userProfile.credits < imageCount) {
      setErrorMessage(`Ban can ${imageCount} luot de thuc hien, nhung chi con ${userProfile.credits} luot. Vui long nang cap Pro.`);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setResults([]);
    setErrorMessage(null);

    try {
      // Send optimized images (already compressed base64)
      const optimizedBaseDataUrls = optimizedBaseImages.map(img => img.dataUrl);
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseImages: optimizedBaseDataUrls,
          refImage: optimizedRefImage.dataUrl,
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needUpgrade) {
          setErrorMessage(data.error);
          setShowUpgradeModal(true);
        } else {
          setErrorMessage(data.error || "Co loi xay ra khi tao prompt");
        }
        return;
      }

      setResults(data.results);
      
      // Update local credits after successful generation
      if (data.remainingCredits !== undefined && data.remainingCredits >= 0) {
        setUserProfile(prev => prev ? {
          ...prev,
          credits: data.remainingCredits,
        } : null);
      }
    } catch (error) {
      console.error("Error generating prompts:", error);
      setErrorMessage("Co loi xay ra. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reset = () => {
    setSelectedMode(null);
    setBaseImages([]);
    setOptimizedBaseImages([]);
    setRefImage(null);
    setOptimizedRefImage(null);
    setResults([]);
    setTokenEstimate(null);
    setSavings(0);
  };

  const modeConfig = MODES.find((m) => m.id === selectedMode);

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] p-4 flex justify-between items-center bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-3">
          {/* User Profile & Credits Display */}
          {userProfile ? (
            <div className="flex items-center gap-3">
              {/* Credits Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                userProfile.isPro 
                  ? "bg-gradient-to-r from-[#F27D26]/20 to-yellow-500/20 border border-[#F27D26]/30 text-[#F27D26]" 
                  : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#888]"
              }`}>
                {userProfile.isPro ? (
                  <>
                    <Crown className="w-4 h-4 text-[#F27D26]" />
                    <span className="text-[#F27D26]">PRO</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>{userProfile.credits} luot</span>
                  </>
                )}
              </div>
              
              {/* User Avatar */}
              <div className="relative group">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#2A2A2A] hover:border-[#F27D26] transition-colors cursor-pointer">
                  {userProfile.avatarUrl ? (
                    <Image
                      src={userProfile.avatarUrl}
                      alt={userProfile.fullName || "User"}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-[#666] text-sm font-bold">
                      {userProfile.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-0 py-2 text-xs whitespace-nowrap shadow-xl min-w-[160px]">
                    <div className="px-3 py-2 border-b border-[#2A2A2A] mb-1">
                      <p className="text-[#E4E3E0] font-medium">{userProfile.fullName || userProfile.email}</p>
                      <p className="text-[#666]">{userProfile.role === "pro" ? "Pro Member" : "Free Account"}</p>
                    </div>
                    <button
                      onClick={async () => {
                        localStorage.removeItem(LS_KEY);
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[#888] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Dang xuat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Loading placeholder - shows while fetching profile */
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-[#1A1A1A] border border-[#2A2A2A] text-[#555]">
                <Coins className="w-4 h-4 animate-pulse" />
                <span className="animate-pulse">Loading...</span>
              </div>
              <div className="w-9 h-9 bg-[#1A1A1A] rounded-full animate-pulse border-2 border-[#2A2A2A]" />
            </div>
          )}
          
          <motion.button
            whileHover={{ rotate: -180 }}
            transition={{ duration: 0.3 }}
            onClick={reset}
            className="p-2.5 hover:bg-[#1A1A1A] rounded-full transition-colors text-[#444] hover:text-[#F27D26]"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && !showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center">
                <Crown className="w-8 h-8 text-[#F27D26]" />
              </div>
              
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-center mb-2">
                Nang Cap Pro
              </h2>
              
              <p className="text-sm text-[#666] text-center mb-6">
                {errorMessage || "Ban da het luot mien phi. Nang cap len Pro de su dung khong gioi han!"}
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-[#888]">
                  <div className="w-5 h-5 rounded-full bg-[#F27D26]/20 flex items-center justify-center">
                    <span className="text-[#F27D26] text-xs">✓</span>
                  </div>
                  <span>Khong gioi han so luot tao prompt</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#888]">
                  <div className="w-5 h-5 rounded-full bg-[#F27D26]/20 flex items-center justify-center">
                    <span className="text-[#F27D26] text-xs">✓</span>
                  </div>
                  <span>Uu tien xu ly nhanh hon</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#888]">
                  <div className="w-5 h-5 rounded-full bg-[#F27D26]/20 flex items-center justify-center">
                    <span className="text-[#F27D26] text-xs">✓</span>
                  </div>
                  <span>Ho tro ky thuat 24/7</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#2A2A2A] text-[#888] hover:bg-[#1A1A1A] transition-colors font-medium"
                >
                  De sau
                </button>
                <a
                  href="/upgrade"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F27D26] to-yellow-500 text-white font-bold text-center hover:opacity-90 transition-opacity"
                >
                  Nang cap ngay
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1800px] mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {!selectedMode ? (
            <ModeSelector onSelectMode={setSelectedMode} />
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <ImageUploader
                  selectedMode={selectedMode}
                  modeConfig={modeConfig}
                  baseImages={baseImages}
                  refImage={refImage}
                  loading={loading}
                  isOptimizing={isOptimizing}
                  tokenEstimate={tokenEstimate}
                  savings={savings}
                  onBack={() => setSelectedMode(null)}
                  onBaseUpload={handleBaseUpload}
                  onRefUpload={handleRefUpload}
                  onRemoveBase={removeBaseImage}
                  onRemoveRef={removeRefImage}
                  onGenerate={generatePrompts}
                />

                <ResultsPanel
                  selectedMode={selectedMode}
                  modeConfig={modeConfig}
                  results={results}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 md:p-8 border-t border-[#1A1A1A] mt-12">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-2 opacity-30">
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
