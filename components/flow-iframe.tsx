"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Minimize2, Maximize2, X, ExternalLink, Loader2 } from "lucide-react";

interface FlowIframeProps {
  isVisible: boolean;
  onClose: () => void;
}

export function FlowIframe({ isVisible, onClose }: FlowIframeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const flowUrl = process.env.NEXT_PUBLIC_FLOW_URL || "https://labs.google/flow";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="mt-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F27D26] to-yellow-500 flex items-center justify-center shadow-lg shadow-[#F27D26]/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Google Flow
                </h3>
                <p className="text-[10px] text-[#666]">
                  Tao anh AI tu prompt cua ban
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Open in new tab */}
              <a
                href={flowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] hover:text-white hover:border-[#F27D26]/50 transition-all"
                title="Mo trong tab moi"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              
              {/* Toggle expand/collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] hover:text-white hover:border-[#F27D26]/50 transition-all"
                title={isExpanded ? "Thu nho" : "Mo rong"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] hover:text-red-400 hover:border-red-500/50 transition-all"
                title="Dong"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe Container */}
          <motion.div
            initial={false}
            animate={{ 
              height: isExpanded ? "70vh" : "120px",
              opacity: 1 
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden"
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin mb-4" />
                <p className="text-sm text-[#666]">Dang tai Google Flow...</p>
              </div>
            )}
            
            {/* Collapsed state message */}
            {!isExpanded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/90 z-10">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] hover:bg-[#F27D26]/20 transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Mo rong Flow</span>
                </button>
              </div>
            )}

            {/* Iframe */}
            <iframe
              src={flowUrl}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
              allow="clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              title="Google Flow"
            />
          </motion.div>

          {/* Tip */}
          <p className="text-[10px] text-[#444] text-center mt-3 italic">
            Meo: Copy prompt o tren va dan vao Flow de tao anh AI
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
