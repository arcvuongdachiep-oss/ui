"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, Layers, Zap } from "lucide-react";
import type { ModeId, ModeConfig, PromptResult } from "@/lib/types";
import { FlowIframe } from "./flow-iframe";

interface ResultsPanelProps {
  selectedMode: ModeId;
  modeConfig: ModeConfig | undefined;
  results: PromptResult[];
}

export function ResultsPanel({
  selectedMode,
  modeConfig,
  results,
}: ResultsPanelProps) {
  // Track copied state separately for English and Vietnamese
  const [copiedEn, setCopiedEn] = useState<number | null>(null);
  const [copiedVi, setCopiedVi] = useState<number | null>(null);
  const [showFlow, setShowFlow] = useState(false);

  const handleCopyEnglish = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedEn(idx);
    setTimeout(() => setCopiedEn(null), 2000);
  };

  const handleCopyVietnamese = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedVi(idx);
    setTimeout(() => setCopiedVi(null), 2000);
  };
  return (
    <div className="lg:col-span-8 xl:col-span-9 space-y-6">
      <AnimatePresence mode="wait">
        {results.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[50vh] lg:min-h-[70vh] border-2 border-dashed border-[#1A1A1A] rounded-2xl flex flex-col items-center justify-center text-center p-8 md:p-12"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-16 md:w-20 h-16 md:h-20 bg-[#0A0A0A] rounded-2xl flex items-center justify-center mb-6 border border-[#1A1A1A]"
            >
              <Layers className="w-6 md:w-8 h-6 md:h-8 text-[#333]" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-bold text-[#444] mb-2 uppercase tracking-widest">
              Workspace Ready
            </h3>
            <p className="text-sm text-[#333] max-w-md font-serif italic">
              {'"Upload your assets to generate the precise prompt for '}
              {modeConfig?.title}.{'"'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#F27D26]/30 to-transparent" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#666] font-bold">
                Generated Results ({results.length})
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#F27D26]/30 to-transparent" />
            </div>

            {results.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden group hover:border-[#F27D26]/30 transition-all"
              >
                {/* Card Header */}
                <div className="p-4 md:p-5 border-b border-[#1A1A1A] flex items-center gap-4 bg-[#0D0D0D]">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-[#222] flex-shrink-0">
                    <img
                      src={res.baseImage}
                      className="w-full h-full object-cover"
                      alt={`Base ${idx}`}
                    />
                  </div>
                  <div>
                    <h4 className="text-[11px] md:text-[12px] font-black uppercase tracking-widest text-[#F27D26]">
                      {res.label ? res.label : `Result #${idx + 1}`}
                    </h4>
                    <p className="text-[8px] md:text-[9px] text-[#444] uppercase tracking-widest font-bold">
                      {modeConfig?.title}
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {/* English Prompt */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 opacity-40">
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest">
                          English Prompt
                        </span>
                        <div className="h-[1px] w-12 bg-white/10" />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCopyEnglish(res.prompt, idx)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all ${
                          copiedEn === idx
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-[#1A1A1A] text-[#888] border border-[#2A2A2A] hover:bg-[#F27D26]/20 hover:text-[#F27D26] hover:border-[#F27D26]/30"
                        }`}
                      >
                        {copiedEn === idx ? <Check size={10} /> : <Copy size={10} />}
                        {copiedEn === idx ? "Da sao chep!" : "Copy"}
                      </motion.button>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-[12px] md:text-[13px] font-mono leading-relaxed text-[#AAA] selection:bg-[#F27D26]/30"
                    >
                      {res.prompt}
                    </motion.p>
                  </div>

                  {/* Vietnamese Prompt */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 opacity-40">
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest">
                          Tieng Viet
                        </span>
                        <div className="h-[1px] w-12 bg-white/10" />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCopyVietnamese(res.vietnamese, idx)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all ${
                          copiedVi === idx
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-[#1A1A1A] text-[#888] border border-[#2A2A2A] hover:bg-[#F27D26]/20 hover:text-[#F27D26] hover:border-[#F27D26]/30"
                        }`}
                      >
                        {copiedVi === idx ? <Check size={10} /> : <Copy size={10} />}
                        {copiedVi === idx ? "Da sao chep!" : "Copy"}
                      </motion.button>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-[12px] md:text-[13px] leading-relaxed text-[#888] selection:bg-[#F27D26]/30"
                      style={{ fontFamily: 'var(--font-vietnamese)' }}
                    >
                      {res.vietnamese}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Create with Flow Button */}
            {!showFlow && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: results.length * 0.1 + 0.2 }}
                className="flex justify-center pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowFlow(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F27D26] to-yellow-500 text-white font-bold text-sm uppercase tracking-wider shadow-xl shadow-[#F27D26]/30 hover:shadow-[#F27D26]/50 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  <span>Bat dau tao anh voi Flow</span>
                </motion.button>
              </motion.div>
            )}

            {/* Flow Iframe */}
            <FlowIframe 
              isVisible={showFlow} 
              onClose={() => setShowFlow(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
