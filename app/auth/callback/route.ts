import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Production URL
  const productionUrl = "https://hiepd5.com";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv ? new URL(request.url).origin : productionUrl;

  if (code) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    
    // Get user IP address from headers
    const forwardedFor = headerStore.get("x-forwarded-for");
    const realIp = headerStore.get("x-real-ip");
    const userIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
    
    console.log("[v0] Callback - IP detected:", userIp);

    // Create client for session handling
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
              // Ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user after session exchange
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log("[v0] Callback - User ID:", user?.id);
      console.log("[v0] Callback - User email:", user?.email);

      if (user) {
        // Use SERVICE ROLE client to bypass RLS for profile updates
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        // Check if this IP has been used before by ANOTHER user
        const { data: existingIpRecords, error: ipCheckError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("last_ip", userIp)
          .neq("id", user.id);
        
        console.log("[v0] Callback - IP check error:", ipCheckError);
        console.log("[v0] Callback - Existing IP records:", existingIpRecords);
        
        const ipAlreadyUsed = existingIpRecords && existingIpRecords.length > 0;
        
        // Check if user profile already exists
        const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
          .from("profiles")
          .select("id, credits, last_ip")
          .eq("id", user.id)
          .single();
        
        console.log("[v0] Callback - Profile check error:", profileCheckError);
        console.log("[v0] Callback - Existing profile:", existingProfile);
        
        if (existingProfile) {
          // User exists - UPDATE last_ip
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ last_ip: userIp })
            .eq("id", user.id);
          
          console.log("[v0] Callback - Update IP result:", updateError ? updateError : "SUCCESS");
        } else {
          // New user - INSERT with anti-spam check
          const newCredits = ipAlreadyUsed ? 0 : 10;
          
          console.log("[v0] Callback - IP already used:", ipAlreadyUsed);
          console.log("[v0] Callback - New credits:", newCredits);
          
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
          
          console.log("[v0] Callback - Insert profile result:", insertError ? insertError : "SUCCESS");
        }
      }
      
      return NextResponse.redirect(`${baseUrl}/`);
    } else {
      console.log("[v0] Callback - Session exchange error:", error);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=Could not authenticate`);
}
