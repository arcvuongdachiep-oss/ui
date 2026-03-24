"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw } from "lucide-react";
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

    setLoading(true);
    setResults([]);

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

      if (!response.ok) {
        throw new Error("Failed to generate prompts");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error("Error generating prompts:", error);
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
        <motion.button
          whileHover={{ rotate: -180 }}
          transition={{ duration: 0.3 }}
          onClick={reset}
          className="p-2.5 hover:bg-[#1A1A1A] rounded-full transition-colors text-[#444] hover:text-[#F27D26]"
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>
      </header>

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