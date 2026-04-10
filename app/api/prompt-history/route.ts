import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 200 });
    }

    const body = await request.json();
    const { prompt, base_image_url, ref_image_url } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required", success: false, data: [] },
        { status: 200 }
      );
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
      console.warn("Prompt history save error:", error.message);
      // Graceful degradation - return 200 instead of 500
      return NextResponse.json(
        { success: true, data: null, tableUnavailable: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Error in POST prompt-history:", err);
    return NextResponse.json(
      { success: true, data: null, tableUnavailable: true },
      { status: 200 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, data: [] }, { status: 200 });
    }

    // Fetch last 10 prompts for user (most recent first)
    const { data, error } = await supabase
      .from("prompt_history")
      .select("id, prompt, base_image_url, ref_image_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Prompt history fetch error:", error.message);
      return NextResponse.json({ success: true, data: [], tableUnavailable: true }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (err) {
    console.error("Error in GET prompt-history:", err);
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get("id");

    if (!historyId) {
      return NextResponse.json(
        { error: "History ID is required", success: false },
        { status: 200 }
      );
    }

    // Delete prompt history entry (verify ownership)
    const { error } = await supabase
      .from("prompt_history")
      .delete()
      .eq("id", historyId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("Prompt history delete error:", error.message);
      return NextResponse.json({ success: true, tableUnavailable: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error in DELETE prompt-history:", err);
    return NextResponse.json({ success: true, tableUnavailable: true }, { status: 200 });
  }
}
