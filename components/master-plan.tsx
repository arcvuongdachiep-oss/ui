"use client";

import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Upload, 
  Image as ImageIcon, 
  Layers, 
  Camera, 
  Sparkles, 
  ChevronRight, 
  Copy, 
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for MasterPlan results
export interface MidShotPrompt {
  zone: string;
  prompt: string;
}

export interface DetailedPrompts {
  closeup: string[];
  cinematic: string[];
  eyeLevel: string[];
}

type MasterPlanTab = 'midshot' | 'cinematic';

interface MasterPlanComponentProps {
  onBack: () => void;
  onAnalyze: (masterPlan: string, perspective: string, type: 'midshot') => Promise<MidShotPrompt[]>;
  onAnalyzeDetailed: (image: string) => Promise<DetailedPrompts>;
  loading: boolean;
  credits: number;
}

export function MasterPlanComponent({ 
  onBack, 
  onAnalyze, 
  onAnalyzeDetailed,
  loading,
  credits 
}: MasterPlanComponentProps) {
  const [activeTab, setActiveTab] = useState<MasterPlanTab>('midshot');
  const [masterPlan, setMasterPlan] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<string | null>(null);
  const [midShotImage, setMidShotImage] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  const [midShotResults, setMidShotResults] = useState<MidShotPrompt[]>([]);
  const [detailedResults, setDetailedResults] = useState<DetailedPrompts | null>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onAnalyzeMidShot = async () => {
    if (!masterPlan || !perspective) return;
    if (credits < 1) {
      setError("Ban da het credit. Vui long nang cap tai khoan.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const results = await onAnalyze(masterPlan, perspective, 'midshot');
      setMidShotResults(results);
    } catch (err) {
      setError("Khong the phan tich hinh anh. Vui long thu lai.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onAnalyzeDetailedPrompts = async () => {
    if (!midShotImage) return;
    if (credits < 1) {
      setError("Ban da het credit. Vui long nang cap tai khoan.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const results = await onAnalyzeDetailed(midShotImage);
      setDetailedResults(results);
    } catch (err) {
      setError("Khong the tao prompt chi tiet. Vui long thu lai.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isLoading = loading || isAnalyzing;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 flex flex-col gap-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#666] hover:text-[#F27D26] transition-colors"
        >
          <ArrowLeft size={14} />
          Quay lai
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#06B6D4] rounded-lg">
            <Building2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">Phat Trien Quy Hoach</h1>
            <p className="text-[9px] text-[#666] uppercase tracking-wider">Master Plan AI</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider">
            Du lieu dau vao
          </label>
          
          <div className="space-y-3">
            <FileDropZone 
              label="Mat bang toan canh" 
              image={masterPlan} 
              onUpload={handleFileUpload(setMasterPlan)} 
              icon={<Layers className="w-4 h-4" />}
            />
            <FileDropZone 
              label="Phoi canh 45 do" 
              image={perspective} 
              onUpload={handleFileUpload(setPerspective)} 
              icon={<ImageIcon className="w-4 h-4" />}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-[11px]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-[#1A1A1A]">
          <p className="text-[9px] text-[#444] leading-relaxed">
            He thong su dung Gemini AI de phan tich cau truc va de xuat y tuong dien hoa chuyen sau.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl">
        {/* Tabs */}
        <div className="flex border-b border-[#1A1A1A]">
          <button 
            onClick={() => setActiveTab('midshot')}
            className={`flex-1 py-4 px-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
              activeTab === 'midshot' ? 'text-[#06B6D4]' : 'text-[#666] hover:text-white'
            }`}
          >
            Goc Trung Canh (5 Phan Khu)
            {activeTab === 'midshot' && (
              <motion.div layoutId="masterplan-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B6D4]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('cinematic')}
            className={`flex-1 py-4 px-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
              activeTab === 'cinematic' ? 'text-[#06B6D4]' : 'text-[#666] hover:text-white'
            }`}
          >
            Phat Trien Can Canh & Cinematic
            {activeTab === 'cinematic' && (
              <motion.div layoutId="masterplan-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B6D4]" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'midshot' ? (
              <motion.div 
                key="midshot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-tight italic">Phan Tich Du An</h2>
                  <p className="text-[#666] text-sm">AI se tu dong chia du an thanh 5 khu vuc noi bat va viet prompt trung canh cho tung khu vuc.</p>
                </div>

                <button 
                  onClick={onAnalyzeMidShot}
                  disabled={isLoading || !masterPlan || !perspective}
                  className={`w-full md:w-auto px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    isLoading || !masterPlan || !perspective
                      ? 'bg-[#111] text-[#333] cursor-not-allowed'
                      : 'bg-[#06B6D4] text-black hover:bg-[#22D3EE] shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Phan tich & De xuat 5 Goc Trung Canh
                </button>

                <div className="grid gap-4">
                  {midShotResults.map((item, idx) => (
                    <PromptCard 
                      key={`mid-card-${idx}`}
                      title={`${idx + 1}. ${item.zone}`}
                      prompt={item.prompt}
                      onCopy={() => copyToClipboard(item.prompt, `mid-${idx}`)}
                      isCopied={copiedIndex === `mid-${idx}`}
                    />
                  ))}
                  
                  {!isLoading && midShotResults.length === 0 && (
                    <div className="border border-dashed border-[#222] rounded-2xl p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center mx-auto">
                        <Building2 className="w-8 h-8 text-[#333]" />
                      </div>
                      <p className="text-[#444] text-sm">Tai len du lieu o thanh ben trai va nhan nut phan tich de bat dau.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="cinematic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-tight italic">Phat Trien Can Canh & Cinematic</h2>
                  <p className="text-[#666] text-sm">Tai len 1 buc anh Trung Canh ma ban da tao de phat trien tiep cac goc may cam xuc.</p>
                </div>

                <div className="bg-black/30 border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
                  <FileDropZone 
                    label="Tai len Anh Trung Canh da chon" 
                    image={midShotImage} 
                    onUpload={handleFileUpload(setMidShotImage)} 
                    icon={<Camera className="w-5 h-5" />}
                    large
                  />
                  
                  <button 
                    onClick={onAnalyzeDetailedPrompts}
                    disabled={isLoading || !midShotImage}
                    className={`w-full px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      isLoading || !midShotImage
                        ? 'bg-[#111] text-[#333] cursor-not-allowed'
                        : 'bg-[#06B6D4] text-black hover:bg-[#22D3EE] shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    }`}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Tao Prompt Can Canh & Cinematic
                  </button>
                </div>

                {detailedResults && (
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-[#06B6D4] flex items-center gap-2 uppercase tracking-wider">
                        <Camera className="w-4 h-4" />
                        Goc Can Canh
                      </h3>
                      <div className="space-y-3">
                        {detailedResults.closeup.map((p, i) => (
                          <PromptCard 
                            key={`closeup-${i}`}
                            title={`Goc can canh #${i + 1}`}
                            prompt={p}
                            onCopy={() => copyToClipboard(p, `closeup-${i}`)}
                            isCopied={copiedIndex === `closeup-${i}`}
                            variant="accent"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-[#06B6D4] flex items-center gap-2 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        Goc Dien Anh
                      </h3>
                      <div className="space-y-3">
                        {detailedResults.cinematic.map((p, i) => (
                          <PromptCard 
                            key={`cinematic-${i}`}
                            title={`Goc dien anh #${i + 1}`}
                            prompt={p}
                            onCopy={() => copyToClipboard(p, `cinematic-${i}`)}
                            isCopied={copiedIndex === `cinematic-${i}`}
                            variant="accent"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-[#06B6D4] flex items-center gap-2 uppercase tracking-wider">
                        <ChevronRight className="w-4 h-4" />
                        Goc Tuyen Truc
                      </h3>
                      <div className="space-y-3">
                        {detailedResults.eyeLevel.map((p, i) => (
                          <PromptCard 
                            key={`eyeLevel-${i}`}
                            title={`Goc tuyen truc #${i + 1}`}
                            prompt={p}
                            onCopy={() => copyToClipboard(p, `eyeLevel-${i}`)}
                            isCopied={copiedIndex === `eyeLevel-${i}`}
                            variant="accent"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function FileDropZone({ label, image, onUpload, icon, large = false }: { 
  label: string; 
  image: string | null; 
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  icon: React.ReactNode;
  large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-[#555] uppercase tracking-wider">{label}</p>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed border-[#222] hover:border-[#06B6D4]/50 rounded-xl transition-all overflow-hidden bg-black/30 ${large ? 'aspect-video' : 'h-24'}`}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={onUpload}
        />
        
        {image ? (
          <>
            <img src={image} alt={label} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/80 p-2 rounded-full">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#444] group-hover:text-[#666]">
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">Nhan de tai len</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptCard({ title, prompt, onCopy, isCopied, variant = 'default' }: { 
  title: string; 
  prompt: string; 
  onCopy: () => void; 
  isCopied: boolean;
  variant?: 'default' | 'accent';
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-[#0D0D0D] border rounded-xl p-4 space-y-3 group transition-all hover:border-[#333] ${
        variant === 'accent' ? 'border-[#06B6D4]/20' : 'border-[#1A1A1A]'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${variant === 'accent' ? 'text-[#06B6D4]' : 'text-white'}`}>{title}</h3>
        <button 
          onClick={onCopy}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#666] hover:text-white"
          title="Copy to clipboard"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="bg-black/50 p-3 rounded-lg border border-[#1A1A1A]">
        <p className="text-[11px] text-[#888] leading-relaxed font-mono">
          {prompt}
        </p>
      </div>
    </motion.div>
  );
}
