import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQueueStatus, getQueuePosition, checkRateLimit, QUEUE_CONFIG } from "@/lib/queue";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queueStatus = getQueueStatus();
    const position = getQueuePosition(user.id);
    const rateLimit = checkRateLimit(user.id);

    return NextResponse.json({
      position,
      queueLength: queueStatus.queueLength,
      processing: queueStatus.processing,
      estimatedWait: position > 0 ? position * 30 : 0,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
        max: QUEUE_CONFIG.RATE_LIMIT_MAX,
        windowMinutes: QUEUE_CONFIG.RATE_LIMIT_WINDOW / 60,
      }
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
