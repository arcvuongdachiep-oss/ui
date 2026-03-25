import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch user credits
export async function GET() {
  try {
    const supabase = await createClient();
    
    console.log("[v0] Credits API - Getting user...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log("[v0] Credits API - User:", user?.id, user?.email);
    console.log("[v0] Credits API - User error:", userError);
    
    if (userError || !user) {
      console.log("[v0] Credits API - Unauthorized, no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[v0] Credits API - Fetching profile for user:", user.id);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, role, email, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    console.log("[v0] Credits API - Profile:", profile);
    console.log("[v0] Credits API - Profile error:", profileError);

    if (profileError) {
      console.log("[v0] Credits API - Profile not found");
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const response = {
      credits: profile.credits ?? 10,
      role: profile.role ?? "free",
      isPro: profile.role === "pro",
      email: profile.email || user.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
    };
    
    console.log("[v0] Credits API - Returning:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[v0] Credits API - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Deduct credits
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1 || amount > 4) {
      return NextResponse.json({ error: "Invalid amount (1-4)" }, { status: 400 });
    }

    // Call the deduct_credits function
    const { data, error } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (error) {
      console.error("Error deducting credits:", error);
      return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 });
    }

    const result = data?.[0];

    if (!result?.success) {
      return NextResponse.json({
        success: false,
        credits: result?.remaining_credits,
        message: result?.message || "Không đủ lượt để thực hiện",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      credits: result.remaining_credits,
      message: result.message,
    });
  } catch (error) {
    console.error("Deduct credits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
