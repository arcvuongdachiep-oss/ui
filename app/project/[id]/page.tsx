"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  gallery_urls: string[];
  software_tags: string[];
  download_cost: number;
  video_url: string | null;
  view_count: number;
  download_count: number;
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error("Project not found");
        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error("[v0] Error fetching project:", err);
        setError("Không thể tải dự án");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F27D26]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <p className="text-[#888] text-lg">{error || "Dự án không tồn tại"}</p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#F27D26] text-black font-bold rounded-lg hover:bg-[#E26D16]"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const currentImage = project.gallery_urls?.[selectedImageIndex];
  const hasGallery = project.gallery_urls && project.gallery_urls.length > 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur border-b border-[#1A1A1A] p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#F27D26] hover:text-[#E26D16] font-bold"
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </Link>
      </div>

      <main className="max-w-6xl mx-auto">
        {/* Video Header */}
        <div className="aspect-video bg-black relative overflow-hidden rounded-lg my-6">
          {project.video_url ? (
            <iframe
              src={project.video_url}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1A1A1A] to-black">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-[#F27D26]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#F27D26]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
                <p className="text-[#888] font-semibold">Video giới thiệu đang cập nhật</p>
              </div>
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-4">
                {project.title}
              </h1>
              <p className="text-[#888] text-lg leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Software Tags */}
            {project.software_tags && project.software_tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase text-[#666]">Công Cụ</h3>
                <div className="flex flex-wrap gap-2">
                  {project.software_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#F27D26]/10 text-[#F27D26] rounded-full text-sm font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1A1A1A]">
              <div>
                <p className="text-[#666] text-xs font-bold uppercase mb-1">Lượt Xem</p>
                <p className="text-2xl font-black text-white">{project.view_count}</p>
              </div>
              <div>
                <p className="text-[#666] text-xs font-bold uppercase mb-1">Lượt Tải</p>
                <p className="text-2xl font-black text-white">{project.download_count}</p>
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="space-y-4">
            {project.thumbnail_url && (
              <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
                <Image
                  src={project.thumbnail_url}
                  alt={project.title}
                  width={300}
                  height={300}
                  className="w-full aspect-square object-cover"
                />
              </div>
            )}

            {/* Download Button */}
            <button className="w-full px-4 py-4 bg-[#F27D26] text-black font-black uppercase rounded-lg hover:bg-[#E26D16] transition-colors flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              <span>Tải File D5 Gốc</span>
              <div className="flex items-center gap-1 ml-auto">
                <Zap className="w-4 h-4" />
                <span>{project.download_cost}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Gallery */}
        {hasGallery && (
          <div className="py-8 space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-wider">Thư Viện Ảnh</h2>

            {/* Main Image */}
            <div
              className="relative aspect-video bg-[#1A1A1A] rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setShowLightbox(true)}
            >
              <Image
                src={currentImage}
                alt={`Gallery ${selectedImageIndex}`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-black/70 transition-colors">
                  <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-4">
              {project.gallery_urls.map((url, index) => (
                <div
                  key={index}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedImageIndex === index
                      ? "border-[#F27D26]"
                      : "border-[#1A1A1A] hover:border-[#333]"
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={url}
                    alt={`Thumbnail ${index}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-[#F27D26]"
              onClick={() => setShowLightbox(false)}
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Image
                src={currentImage}
                alt="Lightbox"
                fill
                className="object-contain"
              />

              {project.gallery_urls.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) =>
                        prev === 0 ? project.gallery_urls.length - 1 : prev - 1
                      );
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) =>
                        prev === project.gallery_urls.length - 1 ? 0 : prev + 1
                      );
                    }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
