import type { ReactNode } from 'react';

export type ModeId = 'strict' | 'creative' | 'cinematic';

export interface ModeConfig {
  id: ModeId;
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  color: string;
}

export interface PromptResult {
  baseImage: string;
  prompt: string;
  vietnamese: string;
}