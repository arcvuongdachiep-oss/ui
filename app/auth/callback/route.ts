import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=No code provided`);
  }

  const cookieStore = await cookies();
  const headerStore = await headers();

  // Get user IP address from headers
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const cfConnectingIp = headerStore.get("cf-connecting-ip");
  const userIp = forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "127.0.0.1";

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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Expected in route handler
          }
        },
      },
    }
  );

  // Exchange code for session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (sessionError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionError.message)}`);
  }

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

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, credits, last_ip")
      .eq("id", user.id)
      .single();

    if (existingProfile) {
      // Update existing profile with new IP
      await supabaseAdmin
        .from("profiles")
        .update({ 
          last_ip: userIp,
          is_verified: !!user.email_confirmed_at
        })
        .eq("id", user.id);
    } else {
      // Create new profile
      const newCredits = ipAlreadyUsed ? 0 : 10;

      await supabaseAdmin
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
    }
  }

  // Create redirect response and manually copy cookies to it
  const redirectUrl = new URL("/", origin);
  const response = NextResponse.redirect(redirectUrl);
  
  // Copy all cookies from the cookie store to the response
  const allCookies = cookieStore.getAll();
  
  allCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  });

  return response;
}
