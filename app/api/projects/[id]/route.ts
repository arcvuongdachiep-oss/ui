import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from("projects")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("id", params.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
