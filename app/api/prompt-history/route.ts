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

    // Save prompt history with error handling for missing table
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

    // If table doesn't exist, silently fail and return success (graceful degradation)
    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("prompt_history")) {
        console.warn("Prompt history table not available:", error.message);
        return NextResponse.json({ success: true, data: null, tableUnavailable: true });
      }
      console.error("Error saving prompt history:", error);
      return NextResponse.json(
        { error: "Failed to save prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error in POST prompt-history:", err);
    // Gracefully handle missing table - don't crash
    return NextResponse.json(
      { success: true, data: null, tableUnavailable: true },
      { status: 200 }
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

    // If table doesn't exist, return empty array (graceful degradation)
    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("prompt_history")) {
        console.warn("Prompt history table not available:", error.message);
        return NextResponse.json({ success: true, data: [], tableUnavailable: true });
      }
      console.error("Error fetching prompt history:", error);
      return NextResponse.json(
        { error: "Failed to fetch prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("Error in GET prompt-history:", err);
    // Gracefully handle missing table - return empty array
    return NextResponse.json(
      { success: true, data: [], tableUnavailable: true },
      { status: 200 }
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

    // If table doesn't exist, still return success (graceful degradation)
    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("prompt_history")) {
        console.warn("Prompt history table not available:", error.message);
        return NextResponse.json({ success: true, tableUnavailable: true });
      }
      console.error("Error deleting prompt history:", error);
      return NextResponse.json(
        { error: "Failed to delete prompt history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE prompt-history:", err);
    // Gracefully handle missing table
    return NextResponse.json(
      { success: true, tableUnavailable: true },
      { status: 200 }
    );
  }
}
