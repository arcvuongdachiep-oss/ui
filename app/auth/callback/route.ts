import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("[v0] Callback - Starting, code exists:", !!code);
  console.log("[v0] Callback - Origin:", origin);

  if (!code) {
    console.log("[v0] Callback - No code provided");
    return NextResponse.redirect(`${origin}/login?error=No code provided`);
  }

  const cookieStore = await cookies();
  const headerStore = await headers();

  // Get user IP address from headers
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const cfConnectingIp = headerStore.get("cf-connecting-ip");
  const userIp = forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "127.0.0.1";
  console.log("[v0] Callback - User IP:", userIp);

  // Create supabase client that will set cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          console.log("[v0] Callback - Setting cookies:", cookiesToSet.map(c => c.name).join(", "));
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.log("[v0] Callback - Cookie set error (expected in route handler):", error);
          }
        },
      },
    }
  );

  // Exchange code for session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (sessionError) {
    console.log("[v0] Callback - Session error:", sessionError.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionError.message)}`);
  }

  console.log("[v0] Callback - Session exchange successful");
  console.log("[v0] Callback - User ID:", sessionData.user?.id);
  console.log("[v0] Callback - User email:", sessionData.user?.email);

  // Get user from session
  const user = sessionData.user;

  if (user) {
    // Use SERVICE ROLE client to bypass RLS for profile operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Check if this IP has been used by another user
    const { data: existingIpRecords } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("last_ip", userIp)
      .neq("id", user.id);

    const ipAlreadyUsed = existingIpRecords && existingIpRecords.length > 0;
    console.log("[v0] Callback - IP already used by others:", ipAlreadyUsed);

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, credits, last_ip")
      .eq("id", user.id)
      .single();

    console.log("[v0] Callback - Existing profile:", existingProfile);

    if (existingProfile) {
      // Update existing profile with new IP
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          last_ip: userIp,
          is_verified: !!user.email_confirmed_at
        })
        .eq("id", user.id);

      console.log("[v0] Callback - Profile update:", updateError ? updateError.message : "SUCCESS");
    } else {
      // Create new profile
      const newCredits = ipAlreadyUsed ? 0 : 10;
      console.log("[v0] Callback - Creating new profile with credits:", newCredits);

      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          role: "free",
          credits: newCredits,
          is_verified: !!user.email_confirmed_at,
          last_ip: userIp,
        });

      console.log("[v0] Callback - Profile insert:", insertError ? insertError.message : "SUCCESS");
    }
  }

  // Create redirect response and manually copy cookies to it
  const redirectUrl = new URL("/", origin);
  const response = NextResponse.redirect(redirectUrl);
  
  // Copy all cookies from the cookie store to the response
  const allCookies = cookieStore.getAll();
  console.log("[v0] Callback - Copying cookies to response:", allCookies.map(c => c.name).join(", "));
  
  allCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  });

  console.log("[v0] Callback - Redirecting to home");
  return response;
}
