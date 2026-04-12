import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    // Get user from session
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Please log in to download" },
        { status: 401 }
      );
    }

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { message: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("is_published", true)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Check credits
    if (profile.credits < project.download_cost) {
      return NextResponse.json(
        {
          message: "Insufficient credits. Please upgrade your account.",
          required: project.download_cost,
          available: profile.credits,
        },
        { status: 402 }
      );
    }

    // Deduct credits
    const newCredits = profile.credits - project.download_cost;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Record download
    await supabase.from("download_history").insert({
      user_id: user.id,
      project_id: projectId,
      credits_spent: project.download_cost,
      downloaded_at: new Date().toISOString(),
    });

    // Update download count
    await supabase
      .from("projects")
      .update({ download_count: (project.download_count || 0) + 1 })
      .eq("id", projectId);

    // Generate presigned URL (assuming file is in Supabase storage)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("project-files")
      .createSignedUrl(project.file_path, 3600); // 1 hour expiry

    if (signError || !signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      downloadUrl: signedUrl.signedUrl,
      fileName: `${project.title.replace(/\s+/g, "_")}.zip`,
    });
  } catch (error) {
    console.error("[v0] Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
