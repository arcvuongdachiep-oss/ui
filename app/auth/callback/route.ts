import { createServerClient, type CookieOptions } from "@supabase/ssr";
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

  // Create the redirect response FIRST
  const redirectResponse = NextResponse.redirect(new URL("/", origin));
  
  // Store cookies to set on response
  const cookiesToSetOnResponse: { name: string; value: string; options: CookieOptions }[] = [];

  // Create supabase client that will collect cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          console.log("[v0] Callback - Collecting cookies:", cookiesToSet.map(c => c.name).join(", "));
          // Collect cookies to set on response later
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetOnResponse.push({ name, value, options });
            // Also try to set on cookieStore
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Expected to fail in route handler
            }
          });
        },
      },
    }
  );

  // Exchange code for session - this will call setAll with session cookies
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (sessionError) {
    console.log("[v0] Callback - Session error:", sessionError.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionError.message)}`);
  }

  console.log("[v0] Callback - Session exchange successful");
  console.log("[v0] Callback - User ID:", sessionData.user?.id);
  console.log("[v0] Callback - User email:", sessionData.user?.email);
  console.log("[v0] Callback - Cookies collected:", cookiesToSetOnResponse.length);

  // Set ALL collected cookies on the redirect response
  cookiesToSetOnResponse.forEach(({ name, value, options }) => {
    console.log("[v0] Callback - Setting cookie on response:", name);
    redirectResponse.cookies.set(name, value, {
      path: options.path || "/",
      maxAge: options.maxAge,
      domain: options.domain,
      sameSite: (options.sameSite as "lax" | "strict" | "none") || "lax",
      secure: options.secure ?? process.env.NODE_ENV === "production",
      httpOnly: options.httpOnly ?? true,
    });
  });

  // Get user from session for profile operations
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

  console.log("[v0] Callback - Redirecting to home with cookies");
  return redirectResponse;
}
