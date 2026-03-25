"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Zap, Crown, AlertCircle, X, LogOut, ChevronDown } from "lucide-react";
import Image from "next/image";
import type { ModeId, PromptResult } from "@/lib/types";
import { ModeSelector, MODES } from "@/components/mode-selector";
import { ImageUploader } from "@/components/image-uploader";
import { ResultsPanel } from "@/components/results-panel";
import { 
  optimizeImage, 
  estimateTokens, 
  calculateSavings,
  type OptimizedImage,
  type TokenEstimate 
} from "@/lib/image-optimizer";

interface UserProfile {
  credits: number;
  role: string;
  isPro: boolean;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export default function Home() {
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

  // Fetch user profile on mount
  useEffect(() => {
    console.log("[v0] useEffect triggered - fetching profile...");
    const fetchProfile = async () => {
      try {
        console.log("[v0] Fetching user profile from /api/credits...");
        const response = await fetch("/api/credits");
        console.log("[v0] Profile response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[v0] User Credits:", data.credits, "Role:", data.role);
          console.log("[v0] Full profile data:", JSON.stringify(data));
          setUserProfile(data);
        } else {
          const errorData = await response.json();
          console.log("[v0] Profile fetch error:", JSON.stringify(errorData));
        }
      } catch (error) {
        console.error("[v0] Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

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
            <div className="flex items-center gap-2">
              {/* Credits Badge with Lightning Icon */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                userProfile.isPro 
                  ? "bg-gradient-to-r from-[#F27D26]/20 to-yellow-500/20 border border-[#F27D26]/30 text-[#F27D26]" 
                  : "bg-[#1A1A1A]/80 backdrop-blur-sm border border-[#2A2A2A] text-yellow-400"
              }`}>
                {userProfile.isPro ? (
                  <>
                    <Crown className="w-4 h-4 text-[#F27D26]" />
                    <span className="text-[#F27D26]">PRO</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{userProfile.credits}</span>
                  </>
                )}
              </div>
              
              {/* User Avatar with Dropdown Menu */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#1A1A1A] transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#2A2A2A] group-hover:border-[#F27D26] transition-colors">
                    {userProfile.avatarUrl ? (
                      <Image
                        src={userProfile.avatarUrl}
                        alt={userProfile.fullName || "User"}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-[#666] text-xs font-bold">
                        {userProfile.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <ChevronDown className="w-3 h-3 text-[#666] group-hover:text-[#888] transition-colors" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#1A1A1A] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-[#1A1A1A]">
                      <p className="text-sm font-medium text-[#E4E3E0] truncate">{userProfile.fullName || userProfile.email}</p>
                      <p className="text-xs text-[#666] truncate">{userProfile.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          userProfile.isPro 
                            ? "bg-[#F27D26]/20 text-[#F27D26]" 
                            : "bg-[#1A1A1A] text-[#666]"
                        }`}>
                          {userProfile.isPro ? "Pro Member" : "Free Account"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Credits Info */}
                    {!userProfile.isPro && (
                      <div className="px-4 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A]/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#666]">Credits</span>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-bold text-yellow-400">{userProfile.credits}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      {!userProfile.isPro && (
                        <a
                          href="/upgrade"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#888] hover:text-[#F27D26] hover:bg-[#F27D26]/5 transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Nang cap Pro</span>
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            await fetch("/api/auth/logout", { method: "POST" });
                            window.location.href = "/login";
                          } catch {
                            window.location.href = "/login";
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#888] hover:text-red-400 hover:bg-red-500/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Dang xuat</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Loading placeholder - shows while fetching profile */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#1A1A1A] border border-[#2A2A2A] text-[#555]">
                <Zap className="w-4 h-4 animate-pulse" />
                <span className="animate-pulse">--</span>
              </div>
              <div className="w-8 h-8 bg-[#1A1A1A] rounded-full animate-pulse border-2 border-[#2A2A2A]" />
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
