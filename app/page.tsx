"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Zap, Crown, AlertCircle, X, LogOut, ChevronDown, Clock, Loader2, MessageCircle, ExternalLink } from "lucide-react";
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

interface QueueStatus {
  position: number;
  estimatedWait: number;
  rateLimitRemaining: number;
  rateLimitResetIn: number;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [optimizedBaseImages, setOptimizedBaseImages] = useState<OptimizedImage[]>([]);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [optimizedRefImage, setOptimizedRefImage] = useState<OptimizedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizingIndices, setOptimizingIndices] = useState<number[]>([]); // Track which base images are optimizing
  const [isRefOptimizing, setIsRefOptimizing] = useState(false); // Track ref image optimization
  const [results, setResults] = useState<PromptResult[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<TokenEstimate | null>(null);
  const [savings, setSavings] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth status on mount and listen for changes
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    
    // Initial auth check - use getUser() for reliable server-validated auth
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (isMounted) {
          console.log("[v0] Initial auth check - user:", currentUser?.email || "null");
          setUser(currentUser);
          if (currentUser) {
            setShowLoginModal(false);
          }
        }
      } catch (error) {
        console.log("[v0] Error getting user:", error);
      }
    };
    
    // Check auth immediately
    checkAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("[v0] Auth state changed:", event, "email:", session?.user?.email || "null");
        
        // Update user state based on event
        if (session?.user) {
          setUser(session.user);
          setShowLoginModal(false);
          console.log("[v0] User updated to:", session.user.email);
        } else {
          setUser(null);
          console.log("[v0] User cleared");
        }
        
        // Refresh profile on SIGNED_IN
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(async () => {
            try {
              const response = await fetch("/api/credits");
              if (response.ok && isMounted) {
                const data = await response.json();
                setUserProfile({
                  credits: data.credits,
                  isPro: data.role === "pro",
                  email: data.email,
                  fullName: data.fullName,
                  avatarUrl: data.avatarUrl,
                });
              }
            } catch {
              console.log("[v0] Error fetching profile");
            }
          }, 500);
        }
      }
    );
    
    // Cleanup
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/credits");
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        }
      } catch {
        // Silent fail
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

    if (filesToProcess.length === 0) return;

    setIsOptimizing(true);

    // Process each file with proper async handling
    const processFile = async (file: File, startIndex: number, fileIndex: number): Promise<void> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            const targetIndex = startIndex + fileIndex;
            
            // Add placeholder image and mark as optimizing
            setBaseImages((prev) => [...prev, dataUrl]);
            setOptimizingIndices((prev) => [...prev, targetIndex]);
            
            try {
              const optimized = await optimizeImage(dataUrl);
              // Replace placeholder with optimized version
              setBaseImages((prev) => {
                const updated = [...prev];
                updated[targetIndex] = optimized.dataUrl;
                return updated;
              });
              setOptimizedBaseImages((prev) => [...prev, optimized]);
            } catch {
              // Keep original if optimization fails
            }
            
            // Remove from optimizing list
            setOptimizingIndices((prev) => prev.filter(i => i !== targetIndex));
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    };

    const startIndex = baseImages.length;
    await Promise.all(filesToProcess.map((file, idx) => processFile(file, startIndex, idx)));
    
    setIsOptimizing(false);
  }, [baseImages.length]);

  const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsOptimizing(true);
      setIsRefOptimizing(true);
      
      const reader = new FileReader();
      reader.onloadend = async (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          // Show placeholder immediately with blur
          setRefImage(dataUrl);
          
          try {
            const optimized = await optimizeImage(dataUrl);
            setRefImage(optimized.dataUrl);
            setOptimizedRefImage(optimized);
          } catch {
            // Keep original if optimization fails
          }
          
          setIsRefOptimizing(false);
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

  // Start cooldown timer
  const startCooldown = (seconds: number) => {
    setCooldownTime(seconds);
    setIsButtonDisabled(true);
    
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
    }
    
    cooldownRef.current = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          setIsButtonDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generatePrompts = async () => {
    console.log("[v0] generatePrompts called");
    console.log("[v0] selectedMode:", selectedMode);
    console.log("[v0] optimizedBaseImages:", optimizedBaseImages.length);
    console.log("[v0] optimizedRefImage:", !!optimizedRefImage);
    console.log("[v0] user state:", user);
    
    if (!selectedMode || optimizedBaseImages.length === 0 || !optimizedRefImage) {
      console.log("[v0] Early return - missing required data");
      return;
    }

    // Check if user is logged in - show login modal if not
    if (!user) {
      console.log("[v0] No user in state, showing login modal");
      setShowLoginModal(true);
      return;
    }

    const imageCount = optimizedBaseImages.length;

    // Check credits before generating (for non-Pro users)
    if (userProfile && !userProfile.isPro && userProfile.credits < imageCount) {
      setErrorMessage(`Ban can ${imageCount} luot de thuc hien, nhung chi con ${userProfile.credits} luot. Vui long nang cap Pro.`);
      setShowUpgradeModal(true);
      return;
    }

    // Disable button immediately
    setIsButtonDisabled(true);
    setLoading(true);
    setResults([]);
    setErrorMessage(null);
    setProgress(0);
    setStatusMessage("Dang ket noi...");

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      setStatusMessage("Dang phan tich hinh anh...");
      
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

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit
        if (data.rateLimited) {
          setErrorMessage(data.error);
          startCooldown(data.resetIn || 180);
          return;
        }
        
        // Handle server busy
        if (data.serverBusy) {
          setErrorMessage(data.error);
          setQueueStatus({
            position: data.queueLength || 0,
            estimatedWait: (data.queueLength || 0) * 30,
            rateLimitRemaining: 0,
            rateLimitResetIn: 0,
          });
          return;
        }

        if (data.needUpgrade) {
          setErrorMessage(data.error);
          setShowUpgradeModal(true);
        } else {
          setErrorMessage(data.error || "Co loi xay ra khi tao prompt");
        }
        return;
      }

      setProgress(100);
      setStatusMessage("Hoan thanh!");
      setResults(data.results);
      
      // Update local credits after successful generation
      if (data.remainingCredits !== undefined && data.remainingCredits >= 0) {
        setUserProfile(prev => prev ? {
          ...prev,
          credits: data.remainingCredits,
        } : null);
      }

      // Start 1-minute cooldown after successful request
      startCooldown(60);
      
    } catch {
      setErrorMessage("Co loi xay ra. Vui long thu lai.");
    } finally {
      setLoading(false);
      setStatusMessage("");
      setTimeout(() => setProgress(0), 1000);
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
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#888] hover:text-[#F27D26] hover:bg-[#F27D26]/5 transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Nang cap Pro</span>
                        </button>
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

      {/* Upgrade Modal - Coming Soon */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Close button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 text-[#666] hover:text-white hover:bg-[#1A1A1A] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Icon */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-[#F27D26]/20 rounded-full animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#F27D26] to-yellow-500 flex items-center justify-center shadow-lg shadow-[#F27D26]/30">
                  <Clock className="w-10 h-10 text-white" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-black uppercase tracking-tight text-center mb-2 bg-gradient-to-r from-[#F27D26] to-yellow-400 bg-clip-text text-transparent">
                Coming Soon
              </h2>
              <p className="text-lg font-semibold text-center text-white/90 mb-4">
                Tinh nang dang duoc phat trien
              </p>
              
              {/* Description */}
              <p className="text-sm text-[#888] text-center mb-8 leading-relaxed">
                Chung toi dang no luc hoan thien he thong thanh toan tu dong. Neu ban muon su dung nhieu luot hon ngay bay gio, dung ngan ngai lien he de duoc ho tro rieng.
              </p>
              
              {/* Contact buttons */}
              <div className="space-y-3">
                {/* Zalo button */}
                <a
                  href="https://zalo.me/0979591156"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-[#0068FF] hover:bg-[#0055DD] text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0068FF]/30"
                >
                  <svg className="w-6 h-6" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm0 36c-8.837 0-16-7.163-16-16S15.163 8 24 8s16 7.163 16 16-7.163 16-16 16z"/>
                    <path d="M33.8 19.5c-.7-1.3-2.1-2.1-3.6-2.1h-3.6c-2.3 0-4.2 1.9-4.2 4.2v8.8c0 .6.5 1.1 1.1 1.1s1.1-.5 1.1-1.1v-3.6h5.6c2.3 0 4.2-1.9 4.2-4.2 0-1.1-.4-2.2-1.1-3.1h.5zm-3.6 5.1h-5.6v-3c0-1.1.9-2 2-2h3.6c1.1 0 2 .9 2 2s-.9 2-2 2zM14.2 17.4c-2.3 0-4.2 1.9-4.2 4.2v8.8c0 .6.5 1.1 1.1 1.1s1.1-.5 1.1-1.1v-3.6h2c2.3 0 4.2-1.9 4.2-4.2s-1.9-4.2-4.2-4.2zm0 6.2h-2v-2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2z"/>
                  </svg>
                  <span>Zalo: 0979 591 156</span>
                </a>
                
                {/* Facebook button */}
                <a
                  href="https://www.facebook.com/vuongdachiep/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-[#1877F2] hover:bg-[#1565D8] text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#1877F2]/30"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook: HIEPD5</span>
                  <ExternalLink className="w-4 h-4 opacity-60" />
                </a>
              </div>
              
              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[#1A1A1A]" />
                <span className="text-[10px] text-[#444] uppercase tracking-widest">hoac</span>
                <div className="flex-1 h-px bg-[#1A1A1A]" />
              </div>
              
              {/* Copy phone number */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0979591156");
                  setErrorMessage(null);
                  const btn = document.getElementById("copy-phone-btn");
                  if (btn) {
                    btn.textContent = "Da sao chep!";
                    setTimeout(() => {
                      btn.textContent = "Sao chep so dien thoai";
                    }, 2000);
                  }
                }}
                id="copy-phone-btn"
                className="w-full py-3 px-4 rounded-xl border border-[#2A2A2A] text-[#888] hover:text-[#F27D26] hover:border-[#F27D26]/50 hover:bg-[#F27D26]/5 transition-all text-sm font-medium"
              >
                Sao chep so dien thoai
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal for Guests */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Close button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-2 text-[#666] hover:text-white hover:bg-[#1A1A1A] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Icon */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-[#F27D26]/20 rounded-full animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#F27D26] to-yellow-500 flex items-center justify-center shadow-lg shadow-[#F27D26]/30">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-black uppercase tracking-tight text-center mb-2 bg-gradient-to-r from-[#F27D26] to-yellow-400 bg-clip-text text-transparent">
                Dang nhap de tiep tuc
              </h2>
              <p className="text-lg font-semibold text-center text-white/90 mb-4">
                Ban can dang nhap de tao prompt
              </p>
              
              {/* Description */}
              <p className="text-sm text-[#888] text-center mb-8 leading-relaxed">
                Dang nhap bang tai khoan Google de bat dau tao prompt AI cho du an kien truc cua ban. Mien phi 10 luot cho nguoi dung moi!
              </p>
              
              {/* Login button */}
              <a
                href="/login"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F27D26] to-yellow-500 text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#F27D26]/30"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Dang nhap voi Google</span>
              </a>
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
                  optimizingIndices={optimizingIndices}
                  isRefOptimizing={isRefOptimizing}
                  tokenEstimate={tokenEstimate}
                  savings={savings}
                  progress={progress}
                  statusMessage={statusMessage}
                  isButtonDisabled={isButtonDisabled || optimizingIndices.length > 0 || isRefOptimizing}
                  cooldownTime={cooldownTime}
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
