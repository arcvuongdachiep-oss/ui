"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Search, Download, Eye, Zap } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  download_cost: number;
  view_count: number;
  download_count: number;
  category: string;
  software_tags: string[];
  is_featured: boolean;
}

export function ProjectShowcase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setFilteredProjects(data);
      }
    } catch (error) {
      console.error("[v0] Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = projects;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  }, [searchQuery, selectedCategory, projects]);

  const categories = Array.from(
    new Set(projects.map(p => p.category).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-black py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
            Project Library
          </h1>
          <p className="text-[#666] text-lg">
            Explore architectural visualization projects
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg pl-12 pr-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F27D26]/50"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#F27D26] text-black"
                    : "bg-[#1A1A1A] text-[#666] hover:text-white"
                }`}
              >
                All Projects
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${
                    selectedCategory === cat
                      ? "bg-[#F27D26] text-black"
                      : "bg-[#1A1A1A] text-[#666] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center text-[#666]">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center text-[#666]">No projects found</div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <motion.div
                  whileHover={{ translateY: -8 }}
                  className="group cursor-pointer bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden hover:border-[#F27D26]/50 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-black overflow-hidden">
                    {project.thumbnail_url && (
                      <Image
                        src={project.thumbnail_url}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {project.is_featured && (
                      <div className="absolute top-3 right-3 bg-[#F27D26] text-black px-3 py-1 rounded-full text-xs font-bold">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <h3 className="font-bold text-lg uppercase tracking-tight line-clamp-2">
                      {project.title}
                    </h3>

                    <p className="text-sm text-[#888] line-clamp-2">
                      {project.description}
                    </p>

                    {/* Tags */}
                    {project.software_tags && project.software_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {project.software_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[#1A1A1A] text-[#888] px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats & Download */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]">
                      <div className="flex items-center gap-4 text-xs text-[#666]">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {project.view_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {project.download_count}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#F27D26] font-bold">
                        <Zap className="w-4 h-4" />
                        {project.download_cost}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
