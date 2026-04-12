"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronLeft, Download, Eye, Share2, X, Zap } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  gallery_urls: string[];
  download_cost: number;
  view_count: number;
  download_count: number;
  category: string;
  software_tags: string[];
  file_size_mb: number;
  created_at: string;
  author_id: string;
}

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to load project");
      }
      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadError(null);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Download failed");
      }

      const data = await response.json();

      // Trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#666]">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4">
        <div className="text-red-500">{error || "Project not found"}</div>
        <Link
          href="/projects"
          className="bg-[#F27D26] text-black px-4 py-2 rounded-lg font-bold uppercase text-sm"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-[#1A1A1A] px-4 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-[#F27D26] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate px-4">
            {project.title}
          </h1>
          <div className="w-20" />
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Video Section */}
        {project.video_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-video rounded-2xl overflow-hidden border border-[#1A1A1A] bg-black"
          >
            <iframe
              src={project.video_url}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </motion.div>
        )}

        {/* Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                {project.title}
              </h2>
              <p className="text-[#888] text-lg leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Software Tags */}
            {project.software_tags && project.software_tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#666]">
                  Software Used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.software_tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#1A1A1A] text-[#888] px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {project.gallery_urls && project.gallery_urls.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  Gallery
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {project.gallery_urls.map((url, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setShowLightbox(true);
                      }}
                      className="relative h-32 rounded-lg overflow-hidden border border-[#1A1A1A] cursor-pointer hover:border-[#F27D26]/50 transition-all"
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover hover:scale-110 transition-transform"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#666]">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-bold">{project.view_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#666]">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Downloads</span>
                </div>
                <span className="font-bold">{project.download_count}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]">
                <span className="text-sm text-[#666]">File Size</span>
                <span className="font-bold">{project.file_size_mb} MB</span>
              </div>
            </div>

            {/* Download Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-[#F27D26] hover:bg-[#E26D16] disabled:opacity-50 text-black px-6 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" />
              {isDownloading ? "Downloading..." : "Download"}
            </motion.button>

            {/* Cost Info */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-[#F27D26]">
                <Zap className="w-5 h-5" />
                <span className="font-bold uppercase text-sm">Download Cost</span>
              </div>
              <p className="text-3xl font-black text-[#F27D26]">
                {project.download_cost} Credits
              </p>
              <p className="text-xs text-[#666]">
                Credits will be deducted from your account
              </p>
            </div>

            {downloadError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                {downloadError}
              </div>
            )}

            {/* Share Button */}
            <button className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {showLightbox && project.gallery_urls && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl"
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#F27D26] transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <Image
                src={project.gallery_urls[selectedImageIndex]}
                alt={`Gallery ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            {/* Navigation */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setSelectedImageIndex(
                    (selectedImageIndex - 1 + project.gallery_urls.length) %
                      project.gallery_urls.length
                  )
                }
                className="text-white hover:text-[#F27D26] transition-colors"
              >
                ← Previous
              </button>
              <span className="text-white text-sm">
                {selectedImageIndex + 1} / {project.gallery_urls.length}
              </span>
              <button
                onClick={() =>
                  setSelectedImageIndex(
                    (selectedImageIndex + 1) % project.gallery_urls.length
                  )
                }
                className="text-white hover:text-[#F27D26] transition-colors"
              >
                Next →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
