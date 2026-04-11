"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Zap, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Calendar,
  Tag,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string | null;
  gallery_urls: string[];
  download_cost: number;
  view_count: number;
  download_count: number;
  category: string;
  software_tags: string[];
  is_featured: boolean;
  created_at: string;
}

// Mock project data for development
const MOCK_PROJECTS: Record<string, Project> = {
  "mock-1": {
    id: "mock-1",
    title: "Modern Villa Exterior",
    description: "Stunning modern villa with pool and garden. Full D5 Render project with complete materials and lighting setup. This project includes multiple camera angles, day and night lighting presets, and a comprehensive material library for exterior rendering. Perfect for learning advanced D5 Render techniques or as a base for your own projects.",
    thumbnail_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    video_url: "https://iframe.mediadelivery.net/embed/174738/5c5d7e8a-9c8f-4b3a-8f5a-1234567890ab",
    gallery_urls: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=90",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=90",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=90",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=90",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=90",
    ],
    download_cost: 5,
    view_count: 1234,
    download_count: 89,
    category: "Residential",
    software_tags: ["D5 Render", "SketchUp", "Lumion"],
    is_featured: true,
    created_at: "2024-01-15T10:00:00Z",
  },
  "mock-2": {
    id: "mock-2",
    title: "Luxury Apartment Interior",
    description: "Contemporary apartment design with high-end finishes. Includes all furniture models and material library. Features living room, bedroom, kitchen, and bathroom scenes with professional lighting setups.",
    thumbnail_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    video_url: null,
    gallery_urls: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=90",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=90",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=90",
    ],
    download_cost: 3,
    view_count: 856,
    download_count: 45,
    category: "Interior",
    software_tags: ["D5 Render", "3ds Max"],
    is_featured: true,
    created_at: "2024-02-20T14:30:00Z",
  },
  "mock-3": {
    id: "mock-3",
    title: "Office Building Complex",
    description: "Corporate office building with modern glass facade. Complete exterior and interior scenes included.",
    thumbnail_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    video_url: "https://iframe.mediadelivery.net/embed/174738/office-building-demo",
    gallery_urls: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=90",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=90",
    ],
    download_cost: 8,
    view_count: 567,
    download_count: 23,
    category: "Commercial",
    software_tags: ["D5 Render", "Revit", "Enscape"],
    is_featured: false,
    created_at: "2024-03-10T09:15:00Z",
  },
  "mock-4": {
    id: "mock-4",
    title: "Minimalist Beach House",
    description: "Coastal retreat with panoramic ocean views. Sunset and daytime lighting presets included.",
    thumbnail_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    video_url: null,
    gallery_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=90",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=90",
    ],
    download_cost: 4,
    view_count: 2341,
    download_count: 156,
    category: "Residential",
    software_tags: ["D5 Render", "SketchUp"],
    is_featured: true,
    created_at: "2024-01-28T16:45:00Z",
  },
  "mock-5": {
    id: "mock-5",
    title: "Urban Loft Design",
    description: "Industrial-style loft with exposed brick and modern furnishings. Perfect for portfolio projects.",
    thumbnail_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    video_url: null,
    gallery_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=90",
    ],
    download_cost: 2,
    view_count: 432,
    download_count: 67,
    category: "Interior",
    software_tags: ["D5 Render", "Blender"],
    is_featured: false,
    created_at: "2024-04-05T11:20:00Z",
  },
  "mock-6": {
    id: "mock-6",
    title: "Tropical Resort Hotel",
    description: "Luxury resort with infinity pool and tropical landscaping. Multiple camera angles and time-of-day settings.",
    thumbnail_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    video_url: "https://iframe.mediadelivery.net/embed/174738/tropical-resort-demo",
    gallery_urls: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=90",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=90",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=90",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=90",
    ],
    download_cost: 10,
    view_count: 789,
    download_count: 34,
    category: "Hospitality",
    software_tags: ["D5 Render", "SketchUp", "Twinmotion"],
    is_featured: true,
    created_at: "2024-02-14T08:00:00Z",
  },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    // Check auth status
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
    });
  }, []);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      // First try to fetch from API
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else if (response.status === 404) {
        // Check if it's a mock project
        if (MOCK_PROJECTS[id]) {
          setProject(MOCK_PROJECTS[id]);
        } else {
          setError("Project not found");
        }
      } else {
        throw new Error("Failed to fetch project");
      }
    } catch (err) {
      // Fallback to mock data
      if (MOCK_PROJECTS[id]) {
        setProject(MOCK_PROJECTS[id]);
      } else {
        setError("Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!project) return;

    setIsDownloading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needLogin) {
          setShowLoginModal(true);
        } else {
          alert(data.error || "Download failed");
        }
        return;
      }

      // Open download URL
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    } catch (err) {
      alert("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    if (project?.gallery_urls) {
      setLightboxIndex((prev) => (prev + 1) % project.gallery_urls.length);
    }
  };

  const prevImage = () => {
    if (project?.gallery_urls) {
      setLightboxIndex((prev) => (prev - 1 + project.gallery_urls.length) % project.gallery_urls.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F27D26]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-[#888]">{error || "Project not found"}</p>
        <Link href="/" className="text-[#F27D26] hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm border border-[#333] rounded-lg text-white hover:border-[#F27D26] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Video Section - Full Width */}
      <section className="w-full aspect-video bg-[#0A0A0A] relative">
        {project.video_url ? (
          <iframe
            src={project.video_url}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#1A1A1A] flex items-center justify-center">
              <Play className="w-8 h-8 text-[#666]" />
            </div>
            <p className="text-[#666]">No video available</p>
            {/* Show thumbnail as fallback */}
            {project.thumbnail_url && (
              <div className="absolute inset-0 -z-10">
                <Image
                  src={project.thumbnail_url}
                  alt={project.title}
                  fill
                  className="object-cover opacity-30"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Project Info Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {project.is_featured && (
              <span className="inline-block bg-[#F27D26] text-black px-3 py-1 rounded-full text-xs font-bold uppercase">
                Featured
              </span>
            )}
            
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              {project.title}
            </h1>

            <p className="text-[#888] text-lg leading-relaxed">
              {project.description}
            </p>

            {/* Tags */}
            {project.software_tags && project.software_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.software_tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-[#1A1A1A] border border-[#333] rounded-full text-sm text-[#888]"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#666] flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Views
                </span>
                <span className="text-white font-bold">{project.view_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#666] flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Downloads
                </span>
                <span className="text-white font-bold">{project.download_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#666] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Added
                </span>
                <span className="text-white font-bold">
                  {new Date(project.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#666]">Category</span>
                <span className="text-[#F27D26] font-bold">{project.category}</span>
              </div>

              <hr className="border-[#1A1A1A]" />

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#F27D26] text-black font-bold uppercase rounded-xl hover:bg-[#E26D16] transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download
                    <span className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded">
                      <Zap className="w-4 h-4" />
                      {project.download_cost}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {project.gallery_urls && project.gallery_urls.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
            Gallery
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {project.gallery_urls.map((url, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                onClick={() => openLightbox(index)}
                className="relative aspect-video bg-[#0A0A0A] rounded-xl overflow-hidden cursor-pointer border border-[#1A1A1A] hover:border-[#F27D26]/50 transition-colors"
              >
                <Image
                  src={url}
                  alt={`Gallery image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && project.gallery_urls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 text-white hover:text-[#F27D26] transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-2 text-white hover:text-[#F27D26] transition-colors"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>

            <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <Image
                src={project.gallery_urls[lightboxIndex]}
                alt={`Gallery image ${lightboxIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-2 text-white hover:text-[#F27D26] transition-colors"
            >
              <ChevronRight className="w-10 h-10" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {project.gallery_urls.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 max-w-md w-full text-center space-y-6"
            >
              <div className="w-16 h-16 mx-auto bg-[#F27D26]/10 rounded-full flex items-center justify-center">
                <Download className="w-8 h-8 text-[#F27D26]" />
              </div>
              <h3 className="text-2xl font-black uppercase">Login Required</h3>
              <p className="text-[#888]">
                Please login with your Google account to download this project.
                You need {project.download_cost} credits.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="w-full px-6 py-3 bg-[#F27D26] text-black font-bold uppercase rounded-xl hover:bg-[#E26D16] transition-colors"
                >
                  Login with Google
                </Link>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-[#666] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
