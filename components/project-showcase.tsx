"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Zap, X, ExternalLink } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  download_cost: number;
  software_tags: string[];
  is_featured: boolean;
  view_count: number;
  download_count: number;
  gallery_urls?: string[];
}

interface PreviewState {
  imageUrl: string;
  title: string;
  projectId: string;
}

export function ProjectShowcase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        console.error("[v0] Error fetching projects:", err);
        setError("Không thể tải dự án");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F27D26]" />
      </div>
    );
  }

  if (error || projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[#888] text-lg">{error || "Chưa có dự án nào"}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Quick-preview lightbox */}
    <AnimatePresence>
      {preview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          {/* Close */}
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-[#F27D26] rounded-full flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-5xl max-h-[85vh] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0A0A0A]">
              <Image
                src={preview.imageUrl}
                alt={preview.title}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            {/* Footer bar */}
            <div className="flex items-center justify-between bg-[#0A0A0A]/80 rounded-xl px-4 py-3 border border-[#1A1A1A]">
              <p className="text-white font-bold text-sm line-clamp-1">{preview.title}</p>
              <Link
                href={`/project/${preview.projectId}`}
                className="flex items-center gap-2 text-xs font-bold text-[#F27D26] hover:text-white transition-colors shrink-0 ml-4"
              >
                <span>Xem chi tiet</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="space-y-8">
      {/* Featured Projects */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-wider mb-6">Dự Án Nổi Bật</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.filter(p => p.is_featured).map((project) => {
            const thumb = project.thumbnail_url || project.gallery_urls?.[0] || "";
            return (
            <Link key={project.id} href={`/project/${project.id}`}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="group cursor-pointer bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl overflow-hidden hover:border-[#F27D26]/50 transition-all"
              >
                <div
                  className="relative aspect-video overflow-hidden bg-[#1A1A1A] cursor-zoom-in"
                  onClick={(e) => {
                    if (!thumb) return;
                    e.preventDefault();
                    setPreview({ imageUrl: thumb, title: project.title, projectId: project.id });
                  }}
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#666]">
                      Khong co anh
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Zoom hint */}
                  {thumb && (
                    <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
                      {project.title}
                    </h3>
                    <p className="text-sm text-[#888] line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {project.software_tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs font-bold bg-[#F27D26]/10 text-[#F27D26] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
                    <div className="flex items-center gap-4 text-xs text-[#666]">
                      <span>{project.view_count} lượt xem</span>
                      <span>{project.download_count} tải</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#F27D26] font-bold group-hover:gap-3 transition-all">
                      <span className="text-sm">Xem</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
            );
          })}
        </div>
      </div>

      {/* All Projects */}
      {projects.filter(p => !p.is_featured).length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider mb-6">Tất Cả Dự Án</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.filter(p => !p.is_featured).map((project) => {
              const thumb = project.thumbnail_url || project.gallery_urls?.[0] || "";
              return (
              <Link key={project.id} href={`/project/${project.id}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="group cursor-pointer bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg overflow-hidden hover:border-[#F27D26]/50 transition-all"
                >
                  <div
                    className="relative aspect-video overflow-hidden bg-[#1A1A1A] cursor-zoom-in"
                    onClick={(e) => {
                      if (!thumb) return;
                      e.preventDefault();
                      setPreview({ imageUrl: thumb, title: project.title, projectId: project.id });
                    }}
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#666]">
                        Không có ảnh
                      </div>
                    )}
                    {/* Zoom hint */}
                    {thumb && (
                      <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-bold text-white line-clamp-1 text-sm">
                      {project.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-[#F27D26] font-bold">
                        <Zap className="w-3 h-3" />
                        {project.download_cost}
                      </div>
                      <span className="text-xs text-[#666]">{project.view_count} xem</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
