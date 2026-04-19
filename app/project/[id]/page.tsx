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
            {(project.thumbnail_url || project.gallery_urls?.[0]) && (
              <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
                <Image
                  src={project.thumbnail_url || project.gallery_urls[0]}
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

            {/* Image Grid - each image opens lightbox on click */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.gallery_urls.map((url, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="relative aspect-video bg-[#1A1A1A] rounded-lg overflow-hidden cursor-zoom-in group border border-[#1A1A1A] hover:border-[#F27D26]/40 transition-colors"
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setShowLightbox(true);
                  }}
                >
                  <Image
                    src={url}
                    alt={`Ảnh ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                  {/* Image counter badge */}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                    {index + 1} / {project.gallery_urls.length}
                  </div>
                </motion.div>
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
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={() => setShowLightbox(false)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-[#F27D26] rounded-full flex items-center justify-center text-white transition-colors"
              onClick={() => setShowLightbox(false)}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-sm font-bold px-4 py-1.5 rounded-full">
              {selectedImageIndex + 1} / {project.gallery_urls.length}
            </div>

            {/* Image container */}
            <motion.div
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full max-w-6xl max-h-[90vh] mx-4 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={currentImage}
                alt={`Ảnh ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>

            {/* Navigation arrows */}
            {project.gallery_urls.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-[#F27D26] rounded-full flex items-center justify-center text-white transition-colors"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-[#F27D26] rounded-full flex items-center justify-center text-white transition-colors"
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

            {/* Thumbnail strip */}
            {project.gallery_urls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {project.gallery_urls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(idx);
                    }}
                    className={`relative w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex
                        ? "border-[#F27D26] opacity-100"
                        : "border-white/20 opacity-50 hover:opacity-80"
                    }`}
                  >
                    <Image src={url} alt={`thumb-${idx}`} fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
