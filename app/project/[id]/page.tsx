'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Download, Eye, MessageCircle, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  gallery_urls?: string[];
  software_tags?: string[];
  download_cost: number;
  view_count: number;
  download_count: number;
}

// Mock data for fallback - matches IDs in project-showcase.tsx
const MOCK_PROJECTS: Record<string, Project> = {
  'mock-1': {
    id: 'mock-1',
    title: 'Modern Villa Exterior',
    description: 'Stunning modern villa with pool and garden. Full D5 Render project with complete materials and lighting setup. Includes high-resolution textures and professional camera angles.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    ],
    software_tags: ['D5 Render', 'SketchUp', 'Lumion'],
    download_cost: 5,
    view_count: 1234,
    download_count: 89,
  },
  'mock-2': {
    id: 'mock-2',
    title: 'Luxury Apartment Interior',
    description: 'Contemporary apartment design with high-end finishes. Includes all furniture models and material library.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    ],
    software_tags: ['D5 Render', '3ds Max'],
    download_cost: 3,
    view_count: 856,
    download_count: 45,
  },
  'mock-3': {
    id: 'mock-3',
    title: 'Office Building Complex',
    description: 'Corporate office building with modern glass facade. Complete exterior and interior scenes included.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80',
    ],
    software_tags: ['D5 Render', 'Revit', 'Enscape'],
    download_cost: 8,
    view_count: 567,
    download_count: 23,
  },
  'mock-4': {
    id: 'mock-4',
    title: 'Minimalist Beach House',
    description: 'Coastal retreat with panoramic ocean views. Sunset and daytime lighting presets included.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&q=80',
    ],
    software_tags: ['D5 Render', 'SketchUp'],
    download_cost: 4,
    view_count: 2341,
    download_count: 156,
  },
  'mock-5': {
    id: 'mock-5',
    title: 'Urban Loft Design',
    description: 'Industrial-style loft with exposed brick and modern furnishings. Perfect for portfolio projects.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    ],
    software_tags: ['D5 Render', 'Blender'],
    download_cost: 2,
    view_count: 432,
    download_count: 67,
  },
  'mock-6': {
    id: 'mock-6',
    title: 'Tropical Resort Hotel',
    description: 'Luxury resort with infinity pool and tropical landscaping. Multiple camera angles and time-of-day settings.',
    video_url: '',
    gallery_urls: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
    ],
    software_tags: ['D5 Render', 'SketchUp', 'Twinmotion'],
    download_cost: 10,
    view_count: 789,
    download_count: 34,
  },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        } else {
          // Use mock data on error
          setProject(MOCK_PROJECTS[projectId] || MOCK_PROJECTS['mock-1']);
        }
      } catch (error) {
        console.error('[v0] Failed to fetch project:', error);
        setProject(MOCK_PROJECTS[projectId] || MOCK_PROJECTS['mock-1']);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex items-center justify-center flex-col gap-4">
        <div className="text-[#666] text-center">Project not found</div>
        <Link href="/" className="text-[#F27D26] hover:text-[#E26D16]">
          Back to home
        </Link>
      </div>
    );
  }

  const gallery = project.gallery_urls || [];

  return (
    <main className="w-full bg-[#0A0A0A] min-h-screen">
      <button
        onClick={() => window.history.back()}
        className="fixed top-6 left-6 z-40 flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-[#888] hover:text-white hover:border-[#F27D26] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Video Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full bg-black aspect-video relative overflow-hidden"
      >
        {project.video_url ? (
          <iframe
            src={project.video_url}
            title={project.title}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-black">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-[#F27D26]/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#F27D26]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-[#666] text-sm">Video coming soon</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Project Info Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-8"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-3xl md:text-5xl font-black uppercase italic text-balance">
                {project.title}
              </h1>
              <p className="text-[#888] text-lg leading-relaxed">
                {project.description}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button className="px-6 py-3 bg-[#F27D26] text-black font-bold uppercase rounded-lg hover:bg-[#E26D16] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Tai ve ({project.download_cost} Credits)
              </button>
              <button className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] font-bold uppercase rounded-lg hover:border-[#F27D26] hover:text-white transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Software Tags */}
          {project.software_tags && project.software_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {project.software_tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] text-xs font-bold uppercase rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-6 pt-6 border-t border-[#1A1A1A]">
            <div className="space-y-1">
              <div className="text-[#666] text-xs uppercase font-bold">Views</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#F27D26]" />
                {project.view_count.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[#666] text-xs uppercase font-bold">Downloads</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Download className="w-5 h-5 text-[#F27D26]" />
                {project.download_count.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[#666] text-xs uppercase font-bold">Cost</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <span>⚡</span>
                {project.download_cost} Credits
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        {gallery && gallery.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-[#1A1A1A]">
            <h2 className="text-2xl font-black uppercase">Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((imageUrl, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => {
                    setSelectedImageIndex(idx);
                    setShowImageModal(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  className="relative aspect-video overflow-hidden rounded-xl border border-[#1A1A1A] hover:border-[#F27D26] transition-colors group"
                >
                  <Image
                    src={imageUrl}
                    alt={`${project.title} - Gallery ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Image Modal */}
      {showImageModal && gallery.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-[#888] hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <Image
              src={gallery[selectedImageIndex]}
              alt={`${project.title} - Gallery ${selectedImageIndex + 1}`}
              fill
              className="object-contain"
            />

            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-[#F27D26] text-white rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev + 1) % gallery.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-[#F27D26] text-white rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm">
                  {selectedImageIndex + 1} / {gallery.length}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </main>
  );
}
