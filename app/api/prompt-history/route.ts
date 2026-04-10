import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, base_image_url, ref_image_url } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Save prompt history
    const { data, error } = await supabase
      .from("prompt_history")
      .insert({
        user_id: user.id,
        prompt,
        base_image_url: base_image_url || null,
        ref_image_url: ref_image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving prompt history:", error);
      return NextResponse.json(
        { error: "Failed to save prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error in POST prompt-history:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch last 10 prompts for user (most recent first)
    const { data, error } = await supabase
      .from("prompt_history")
      .select("id, prompt, base_image_url, ref_image_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching prompt history:", error);
      return NextResponse.json(
        { error: "Failed to fetch prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("Error in GET prompt-history:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get("id");

    if (!historyId) {
      return NextResponse.json({ error: "History ID is required" }, { status: 400 });
    }

    // Delete prompt history entry (verify ownership)
    const { error } = await supabase
      .from("prompt_history")
      .delete()
      .eq("id", historyId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting prompt history:", error);
      return NextResponse.json(
        { error: "Failed to delete prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE prompt-history:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
