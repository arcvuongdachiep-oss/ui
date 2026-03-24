"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  ImageIcon,
  RotateCcw,
  Settings2,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import type { ModeId, ModeConfig } from "@/lib/types";
import type { TokenEstimate } from "@/lib/image-optimizer";
import { TokenDisplay } from "./token-display";

interface ImageUploaderProps {
  selectedMode: ModeId;
  modeConfig: ModeConfig | undefined;
  baseImages: string[];
  refImage: string | null;
  loading: boolean;
  isOptimizing: boolean;
  tokenEstimate: TokenEstimate | null;
  savings: number;
  onBack: () => void;
  onBaseUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBase: (index: number) => void;
  onRemoveRef: () => void;
  onGenerate: () => void;
}

export function ImageUploader({
  selectedMode,
  modeConfig,
  baseImages,
  refImage,
  loading,
  isOptimizing,
  tokenEstimate,
  savings,
  onBack,
  onBaseUpload,
  onRefUpload,
  onRemoveBase,
  onRemoveRef,
  onGenerate,
}: ImageUploaderProps) {
  return (
    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-5 md:p-6 space-y-6 lg:sticky lg:top-24"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F27D26]">
            <Settings2 className="w-4 h-4" />
            <h2 className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold">
              Configuration
            </h2>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[8px] md:text-[9px] uppercase tracking-widest text-[#444] hover:text-[#F27D26] transition-colors"
          >
            <ArrowLeft size={10} />
            Back
          </button>
        </div>

        {/* Active Mode Badge */}
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="p-3 md:p-4 rounded-xl bg-black border border-[#1A1A1A] flex items-center gap-3"
        >
          <div
            className="p-2 rounded-lg"
            style={{
              color: modeConfig?.color,
              backgroundColor: `${modeConfig?.color}15`,
            }}
          >
            {modeConfig?.icon}
          </div>
          <div>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-tighter italic">
              {modeConfig?.title}
            </p>
            <p className="text-[7px] md:text-[8px] text-[#444] uppercase font-bold tracking-widest">
              {modeConfig?.subtitle}
            </p>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Base Images */}
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#666] font-bold flex items-center justify-between">
              <span>1. Base Images</span>
              <span className="text-[#F27D26]">{baseImages.length}/4</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence mode="popLayout">
                {baseImages.map((img, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="relative aspect-square rounded-xl overflow-hidden border border-[#222] group"
                  >
                    <img
                      src={img}
                      alt={`Base ${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => onRemoveBase(idx)}
                      className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110"
                    >
                      <X size={12} />
                    </button>
                    <span className="absolute bottom-2 left-2 text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      #{idx + 1}
                    </span>
                    {/* Optimized badge */}
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-emerald-500/80 text-[6px] font-bold uppercase rounded text-black">
                      720p
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {baseImages.length < 4 && (
                <motion.label
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-square border-2 border-dashed border-[#222] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#F27D26]/50 hover:bg-[#F27D26]/5 transition-all group"
                >
                  {isOptimizing ? (
                    <Loader2 className="w-6 h-6 text-[#F27D26] animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-6 h-6 text-[#333] group-hover:text-[#F27D26] transition-colors" />
                      <span className="text-[8px] text-[#333] group-hover:text-[#666] mt-1 uppercase tracking-wider">
                        Add Image
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={onBaseUpload}
                    accept="image/*"
                    multiple
                    disabled={isOptimizing}
                  />
                </motion.label>
              )}
            </div>
          </div>

          {/* Style Image */}
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#666] font-bold">
              2. Style Reference (Skin)
            </label>
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={`relative aspect-video border-2 border-dashed rounded-xl transition-all group overflow-hidden ${
                refImage
                  ? "border-[#F27D26]/40"
                  : "border-[#222] hover:border-[#F27D26]/30"
              }`}
            >
              {refImage ? (
                <>
                  <img
                    src={refImage}
                    alt="Style"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={onRemoveRef}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-6 h-6 text-white" />
                    <span className="text-[10px] uppercase tracking-widest">
                      Change
                    </span>
                  </button>
                  {/* Optimized badge */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-emerald-500/80 text-[6px] font-bold uppercase rounded text-black">
                    720p
                  </span>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-[#F27D26]/5 transition-colors">
                  {isOptimizing ? (
                    <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-[#333] group-hover:text-[#F27D26] transition-colors mb-2" />
                      <span className="text-[10px] text-[#444] group-hover:text-[#666] uppercase tracking-wider">
                        Upload Reference
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={onRefUpload}
                    accept="image/*"
                    disabled={isOptimizing}
                  />
                </label>
              )}
            </motion.div>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGenerate}
          disabled={baseImages.length === 0 || !refImage || loading || isOptimizing}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[11px] md:text-[12px] flex items-center justify-center gap-3 transition-all ${
            baseImages.length === 0 || !refImage || loading || isOptimizing
              ? "bg-[#111] text-[#333] cursor-not-allowed"
              : "bg-[#F27D26] text-black hover:bg-[#FF8C37] shadow-[0_0_30px_rgba(242,125,38,0.3)]"
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {loading ? "Generating..." : "Generate Prompt"}
        </motion.button>

        {/* Token Estimate Display */}
        <TokenDisplay 
          estimate={tokenEstimate} 
          savings={savings} 
          isOptimizing={isOptimizing} 
        />
      </motion.div>
    </div>
  );
}