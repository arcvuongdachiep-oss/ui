import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Production URL - always redirect to hiepd5.com
  const productionUrl = "https://hiepd5.com";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv ? new URL(request.url).origin : productionUrl;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirect to home page after successful login
      return NextResponse.redirect(`${baseUrl}/`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${baseUrl}/login?error=Could not authenticate`);
}
