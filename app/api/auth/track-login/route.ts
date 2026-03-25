import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get IP from request headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

    // Call the track_ip_login function
    const { data, error } = await supabase.rpc("track_ip_login", {
      p_ip_address: ip,
      p_user_id: user.id,
      p_email: user.email,
    });

    if (error) {
      console.error("Error tracking IP:", error);
      return NextResponse.json({ error: "Failed to track login" }, { status: 500 });
    }

    const result = data?.[0];

    // Check if IP is blocked
    if (result?.is_blocked) {
      return NextResponse.json({
        blocked: true,
        message: "Tài khoản của bạn đã bị tạm khóa do hoạt động bất thường.",
      }, { status: 403 });
    }

    // Update last_ip in profiles
    await supabase
      .from("profiles")
      .update({ last_ip: ip })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      ip,
      login_count: result?.login_count,
      unique_emails_from_ip: result?.unique_emails_from_ip,
    });
  } catch (error) {
    console.error("Track login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
