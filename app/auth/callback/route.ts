import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Production URL - always redirect to hiepd5.com
  const productionUrl = "https://hiepd5.com";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv ? new URL(request.url).origin : productionUrl;

  if (code) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    
    // Get user IP address
    const forwardedFor = headerStore.get("x-forwarded-for");
    const realIp = headerStore.get("x-real-ip");
    const userIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
    
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if this IP has been used before by another user
        const { data: existingIpRecords } = await supabase
          .from("profiles")
          .select("id, last_ip")
          .eq("last_ip", userIp)
          .neq("id", user.id);
        
        const ipAlreadyUsed = existingIpRecords && existingIpRecords.length > 0;
        
        // Check if user profile already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, credits")
          .eq("id", user.id)
          .single();
        
        if (existingProfile) {
          // User exists - just update last_ip
          await supabase
            .from("profiles")
            .update({ last_ip: userIp })
            .eq("id", user.id);
        } else {
          // New user - check IP for anti-spam
          // If IP already used by another account, give 0 credits
          const newCredits = ipAlreadyUsed ? 0 : 10;
          
          await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
              role: "free",
              credits: newCredits,
              is_verified: user.email_confirmed_at ? true : false,
              last_ip: userIp,
            }, { onConflict: "id" });
        }
        
        // Track IP login for additional anti-abuse
        await supabase.rpc("track_ip_login", {
          p_ip_address: userIp,
          p_user_id: user.id,
          p_email: user.email || "",
        });
      }
      
      // Redirect to home page after successful login
      return NextResponse.redirect(`${baseUrl}/`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${baseUrl}/login?error=Could not authenticate`);
}
