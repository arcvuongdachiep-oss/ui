import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch user credits
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      credits: profile.credits,
      role: profile.role,
      isPro: profile.role === "pro",
    });
  } catch (error) {
    console.error("Get credits error:", error);
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
