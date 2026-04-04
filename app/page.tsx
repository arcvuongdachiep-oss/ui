"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Zap, Crown, AlertCircle, X, LogOut, ChevronDown, Clock, Loader2, MessageCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ModeId, PromptResult, TabId } from "@/lib/types";
import { ModeSelector, MODES } from "@/components/mode-selector";
import { Camera, Layers, Grid3X3, BookOpen } from "lucide-react";
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

interface QueueStatus {
  position: number;
  estimatedWait: number;
  rateLimitRemaining: number;
  rateLimitResetIn: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('ai-prompt');
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
  const [userInstructions, setUserInstructions] = useState("");
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

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
    const isRefRequired = selectedMode !== 'random';
    if (!selectedMode || optimizedBaseImages.length === 0 || (isRefRequired && !optimizedRefImage)) return;

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
          refImage: optimizedRefImage?.dataUrl || null,
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
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.4)]"
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
              <h1 className="text-base md:text-xl font-black tracking-tighter uppercase italic leading-none">
                HIEPD5.COM
              </h1>
              <p className="text-[7px] md:text-[9px] text-[#666] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">
                Scientific Prompt Architect
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-[#1A1A1A]">
            {([
              { id: 'ai-prompt', label: 'AI Prompt' },
              { id: 'd5-tutorial', label: 'D5 Tutorial' },
              { id: 'showcase', label: 'Showcase' },
              { id: 'library', label: 'Library' },
            ] as { id: TabId; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#F27D26] text-black shadow-[0_0_15px_rgba(242,125,38,0.3)]'
                    : 'text-[#666] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
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

      <main className="max-w-[1800px] mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'ai-prompt' ? (
            <motion.div
              key="ai-prompt-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
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
                      userInstructions={userInstructions}
                      onUserInstructionsChange={setUserInstructions}
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

              {/* AI Resources Section */}
              {!selectedMode && (
                <div className="mt-16 pt-16 border-t border-[#1A1A1A] space-y-12 max-w-5xl mx-auto">
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">AI ARCHVIZ RESOURCES</h2>
                    <p className="text-[#666] uppercase tracking-[0.3em] text-[10px] font-bold">Master the tools of the future</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#F27D26]">
                        <BookOpen className="w-4 h-4" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Video Huong Dan Su Dung</h3>
                      </div>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-[#1A1A1A] bg-black shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <iframe 
                          className="w-full h-full"
                          src="https://www.youtube.com/embed/auouVOCAbTI" 
                          title="Huong dan su dung" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowFullScreen
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#F27D26]">
                        <Grid3X3 className="w-4 h-4" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Ung dung AI trong Dien hoa</h3>
                      </div>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-[#1A1A1A] bg-black shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <iframe 
                          className="w-full h-full"
                          src="https://www.youtube.com/embed/videoseries?list=PLAxnVKb5XqwVdEsJm4-eKY2picTnVQn0E" 
                          title="AI in Archviz Playlist" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'd5-tutorial' ? (
            <motion.div
              key="d5-tutorial-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto py-8 md:py-12 space-y-16"
            >
              {/* Weekly D5 Render Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-[#1A1A1A]" />
                  <div className="text-center px-4 md:px-8">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none text-[#F27D26]">WEEKLY D5 RENDER</h2>
                    <p className="text-[#444] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[8px] md:text-[9px] font-bold mt-2">Huong dan D5 Render moi tuan cung Hiep</p>
                  </div>
                  <div className="h-[1px] flex-1 bg-[#1A1A1A]" />
                </div>

                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <div className="aspect-video w-full">
                    <iframe 
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/pMol34YU6Pk" 
                      title="Weekly D5 Render Tutorial" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowFullScreen
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0A0A0A] to-[#0D0D0D]">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Cap nhat kien thuc moi tuan</h3>
                      <p className="text-xs text-[#666]">Theo doi danh sach phat de khong bo lo cac ky thuat render moi nhat.</p>
                    </div>
                    <a 
                      href="https://youtube.com/playlist?list=PLAxnVKb5XqwVaD79Kf3S6Tuguc2aM2A_M" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 md:px-8 py-3 md:py-4 bg-[#F27D26] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF8C37] transition-all shadow-[0_0_20px_rgba(242,125,38,0.2)] whitespace-nowrap"
                    >
                      Xem danh sach phat
                    </a>
                  </div>
                </div>
              </div>

              {/* Free Basic Course Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-[#1A1A1A]" />
                  <div className="text-center px-4 md:px-8">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none text-[#F27D26]">FREE BASIC COURSE</h2>
                    <p className="text-[#444] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[8px] md:text-[9px] font-bold mt-2">Khoa hoc D5 Render co ban cho nguoi moi bat dau</p>
                  </div>
                  <div className="h-[1px] flex-1 bg-[#1A1A1A]" />
                </div>

                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <div className="aspect-video w-full">
                    <iframe 
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/videoseries?list=PLAxnVKb5XqwUD_rpWIupGl20BT2cTIKBX" 
                      title="D5 Render Basic Course" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowFullScreen
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0A0A0A] to-[#0D0D0D]">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Lo trinh lam chu D5 Render</h3>
                      <p className="text-xs text-[#666]">Hoc tu con so 0 den khi lam chu anh sang va vat lieu chuyen nghiep.</p>
                    </div>
                    <a 
                      href="https://youtube.com/playlist?list=PLAxnVKb5XqwUD_rpWIupGl20BT2cTIKBX" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 md:px-8 py-3 md:py-4 bg-[#F27D26] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF8C37] transition-all shadow-[0_0_20px_rgba(242,125,38,0.2)] whitespace-nowrap"
                    >
                      Xem tren YouTube
                    </a>
                  </div>
                </div>
              </div>

              {/* D5 Pro Features Section */}
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none text-[#F27D26]">Tính năng phiên bản D5 Render Pro</h2>
                  <p className="text-[#444] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[8px] md:text-[9px] font-bold">Danh sách các tính năng cao cấp trong phiên bản Pro</p>
                </div>
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <div className="aspect-video w-full">
                    <iframe 
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/videoseries?list=PLAxnVKb5XqwUY5mDoktLsCq5jSI6GiYWS" 
                      title="D5 Render Pro Features" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowFullScreen
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0A0A0A] to-[#0D0D0D]">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Tìm hiểu tính năng cao cấp</h3>
                      <p className="text-xs text-[#666]">Xem danh sách phát tính năng D5 Render Pro để phát triển kỹ năng rendering.</p>
                    </div>
                    <a 
                      href="https://youtube.com/playlist?list=PLAxnVKb5XqwUY5mDoktLsCq5jSI6GiYWS" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 md:px-8 py-3 md:py-4 bg-[#F27D26] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF8C37] transition-all shadow-[0_0_20px_rgba(242,125,38,0.2)] whitespace-nowrap"
                    >
                      Xem playlist
                    </a>
                  </div>
                </div>
              </div>

              {/* D5 Masterclass Section */}
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">D5 MASTERCLASS</h2>
                  <p className="text-[#666] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[9px] md:text-[10px] font-bold">Scientific workflows for architectural visualization</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {[
                    { title: "Advanced Lighting", level: "Expert", time: "24m", desc: "Mastering global illumination and volumetric light rays for cinematic depth." },
                    { title: "Material Science", level: "Intermediate", time: "18m", desc: "Creating realistic PBR materials with custom displacement and roughness maps." },
                    { title: "Atmospheric Depth", level: "Advanced", time: "15m", desc: "Using fog, particles, and weather effects to tell a compelling spatial story." },
                    { title: "Camera Precision", level: "Pro", time: "12m", desc: "Professional photography techniques: Focal length, DOF, and composition rules." },
                    { title: "Exterior Realism", level: "Expert", time: "32m", desc: "Full workflow for high-end exterior rendering from SketchUp to D5." },
                    { title: "Interior Moods", level: "Intermediate", time: "20m", desc: "Crafting cozy and inviting interior spaces with natural light simulation." }
                  ].map((tutorial, i) => (
                    <div key={i} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden group hover:border-[#F27D26]/30 transition-all flex flex-col">
                      <div className="aspect-video bg-[#050505] relative overflow-hidden">
                        <img 
                          src={`https://picsum.photos/seed/d5tut${i}/800/450`} 
                          alt={tutorial.title}
                          className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity group-hover:scale-105 duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#F27D26] flex items-center justify-center text-black scale-90 group-hover:scale-100 transition-transform shadow-[0_0_20px_rgba(242,125,38,0.4)]">
                            <Camera size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 md:p-8 space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-[#F27D26]/10 text-[#F27D26] text-[9px] font-black uppercase tracking-widest rounded border border-[#F27D26]/20">{tutorial.level}</span>
                          <span className="text-[9px] text-[#444] uppercase font-bold tracking-widest">{tutorial.time}</span>
                        </div>
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic leading-tight group-hover:text-[#F27D26] transition-colors">{tutorial.title}</h3>
                        <p className="text-xs text-[#666] leading-relaxed flex-1">{tutorial.desc}</p>
                        <button className="w-full py-3 md:py-4 bg-black border border-[#1A1A1A] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#F27D26] hover:text-black hover:border-[#F27D26] transition-all mt-4">COMING SOON</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'showcase' ? (
            <motion.div
              key="showcase-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8 md:py-12 space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                  <span className="text-white">GALLERY</span> <span className="text-[#F27D26]">SHOWCASE</span>
                </h2>
                <p className="text-[#666] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[9px] md:text-[10px] font-bold">The intersection of AI precision and human creativity</p>
              </div>

              {/* Masonry Gallery */}
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="break-inside-avoid mb-4 group"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-[#1A1A1A] hover:border-[#F27D26]/30 transition-all">
                      <img
                        src={`https://picsum.photos/seed/showcase${i}/${400 + (i % 3) * 100}/${300 + (i % 4) * 100}`}
                        alt={`Showcase ${i + 1}`}
                        className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="text-[10px] text-[#F27D26] uppercase tracking-widest font-bold">Project Alpha {i + 1}</p>
                          <p className="text-[8px] text-white/60 uppercase tracking-wider">Rendered with AI + D5</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'library' ? (
            <motion.div
              key="library-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto py-8 md:py-12 space-y-16"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">ASSET LIBRARY</h2>
                <p className="text-[#666] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[9px] md:text-[10px] font-bold">Professional resources for high-end visualization</p>
              </div>

              {/* Asset Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: <Layers className="w-6 h-6" />, title: "PBR TEXTURES", count: "450+", desc: "Premium Assets" },
                  { icon: <Grid3X3 className="w-6 h-6" />, title: "3D MODELS", count: "1200+", desc: "Premium Assets" },
                  { icon: <Camera className="w-6 h-6" />, title: "HDRI SKIES", count: "85+", desc: "Premium Assets" },
                  { icon: <BookOpen className="w-6 h-6" />, title: "D5 PRESETS", count: "200+", desc: "Premium Assets" },
                ].map((category, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 md:p-8 text-center group hover:border-[#F27D26]/30 transition-all"
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-xl bg-black border border-[#1A1A1A] flex items-center justify-center text-[#F27D26] group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic mb-1">{category.title}</h3>
                    <p className="text-[9px] text-[#666] uppercase tracking-widest font-bold mb-6">{category.count} {category.desc}</p>
                    <button className="w-full py-3 bg-black border border-[#1A1A1A] rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#F27D26] hover:text-black hover:border-[#F27D26] transition-all">
                      COMING SOON
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Weekly Asset Drop */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-2">WEEKLY ASSET DROP</h3>
                    <p className="text-sm text-[#666]">Get the latest high-quality textures and models delivered to your dashboard every Monday.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                      type="email"
                      placeholder="ENTER EMAIL"
                      className="flex-1 md:w-64 px-4 py-3 bg-black border border-[#1A1A1A] rounded-xl text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#F27D26]/50 uppercase tracking-wider"
                    />
                    <button className="px-6 py-3 bg-[#F27D26] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF8C37] transition-all whitespace-nowrap">
                      SUBSCRIBE
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
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
