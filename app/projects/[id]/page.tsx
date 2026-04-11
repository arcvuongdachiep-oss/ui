"use client";

import { ProjectDetail } from "@/components/project-detail";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProjectDetail projectId={params.id} />;
}
