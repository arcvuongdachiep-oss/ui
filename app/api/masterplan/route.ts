import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedOrigin,
  withCorsHeaders,
  blockedResponse,
  sanitizeBase64Image,
} from "@/lib/security";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return blockedResponse();
  }
  return withCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

export async function POST(request: NextRequest) {
  // Security check
  if (!isAllowedOrigin(request)) {
    return blockedResponse();
  }

  try {
    // Check API key
    if (!genAI || !GEMINI_API_KEY) {
      return withCorsHeaders(
        NextResponse.json({ error: "API key not configured" }, { status: 500 }),
        request
      );
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return withCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        request
      );
    }

    // Get user profile and check credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return withCorsHeaders(
        NextResponse.json({ error: "Insufficient credits" }, { status: 403 }),
        request
      );
    }

    const body = await request.json();
    const { masterPlan, perspective, midShotImage, type } = body;

    // Validate inputs
    if (type === 'midshot' && (!masterPlan || !perspective)) {
      return withCorsHeaders(
        NextResponse.json({ error: "masterPlan and perspective images are required" }, { status: 400 }),
        request
      );
    }

    if (type === 'detailed' && !midShotImage) {
      return withCorsHeaders(
        NextResponse.json({ error: "midShotImage is required" }, { status: 400 }),
        request
      );
    }

    // Get user profile to check credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return withCorsHeaders(
        NextResponse.json({ error: "Không tìm thấy thông tin người dùng" }, { status: 404 }),
        request
      );
    }

    // Check credits (Pro users have unlimited, masterplan costs 3 credits per analysis)
    const CREDIT_COST = 3;
    const isPro = profile.role === "pro";
    if (!isPro && profile.credits < CREDIT_COST) {
      return withCorsHeaders(
        NextResponse.json({
          error: `Bạn cần ${CREDIT_COST} lượt để thực hiện, nhưng chỉ còn ${profile.credits} lượt. Vui lòng nâng cấp Pro.`,
          needUpgrade: true,
          required: CREDIT_COST,
          available: profile.credits,
        }, { status: 400 }),
        request
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let result;

    // Helper to extract pure base64 data from data URL
    const extractBase64 = (dataUrl: string | null): string | null => {
      if (!dataUrl) return null;
      const parts = dataUrl.split(',');
      return parts.length > 1 ? parts[1] : dataUrl;
    };

    if (type === 'midshot') {
      // Analyze project zones - 5 mid-shot prompts
      const sanitizedMasterPlan = sanitizeBase64Image(masterPlan);
      const sanitizedPerspective = sanitizeBase64Image(perspective);
      const base64MasterPlan = extractBase64(sanitizedMasterPlan);
      const base64Perspective = extractBase64(sanitizedPerspective);

      if (!base64MasterPlan || !base64Perspective) {
        return withCorsHeaders(
          NextResponse.json({ error: "Invalid image data format" }, { status: 400 }),
          request
        );
      }

      const systemInstruction = `
        BẠN LÀ MỘT CHUYÊN GIA QUY HOẠCH VÀ DIỄN HỌA KIẾN TRÚC.
        
        NHIỆM VỤ: Phân tích mặt bằng tổng thể và phối cảnh 45 độ để:
        1. Chia dự án thành 5 KHU VỰC NỔI BẬT nhất (ví dụ: Khu vực lối vào chính, Khu sân vườn trung tâm, Khu tháp cao tầng, Khu tiện ích cộng đồng, Khu bể bơi/cảnh quan)
        2. Viết PROMPT TRUNG CẢNH (góc nhìn bao quát từ trên cao) cho từng khu vực
        
        YÊU CẦU PROMPT:
        - Mỗi prompt phải mô tả rõ: loại công trình, vật liệu chính, ánh sáng, góc camera, bối cảnh
        - Sử dụng ngôn ngữ chuyên nghiệp cho AI image generation
        - Thêm các tham số: photorealistic, high-end archviz, aerial perspective, masterplan visualization
        
        ĐỊNH DẠNG TRẢ VỀ JSON:
        [
          { "zone": "Tên khu vực 1", "prompt": "prompt chi tiết..." },
          { "zone": "Tên khu vực 2", "prompt": "prompt chi tiết..." },
          { "zone": "Tên khu vực 3", "prompt": "prompt chi tiết..." },
          { "zone": "Tên khu vực 4", "prompt": "prompt chi tiết..." },
          { "zone": "Tên khu vực 5", "prompt": "prompt chi tiết..." }
        ]
      `;

      const generateResult = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64MasterPlan,
              },
            },
            { text: "Đây là mặt bằng tổng thể (Master Plan)" },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Perspective,
              },
            },
            { text: "Đây là phối cảnh 45 độ của dự án. Hãy phân tích và tạo 5 prompt trung cảnh." },
          ],
        }],
      });

      const responseText = generateResult.response.text();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format from AI");
      }

    } else if (type === 'detailed') {
      // Generate detailed prompts (closeup, cinematic, eye-level)
      const sanitizedMidShot = sanitizeBase64Image(midShotImage);
      const base64MidShot = extractBase64(sanitizedMidShot);

      if (!base64MidShot) {
        return withCorsHeaders(
          NextResponse.json({ error: "Invalid image data format" }, { status: 400 }),
          request
        );
      }

      const systemInstruction = `
        BẠN LÀ MỘT ĐẠO DIỄN HÌNH ẢNH KIẾN TRÚC CHUYÊN NGHIỆP.
        
        NHIỆM VỤ: Dựa trên ảnh trung cảnh này, tạo ra 3 LOẠI GÓC MÁY CẢM XÚC:
        
        1. GÓC CẬN CẢNH (Close-up) - 2 prompts:
           - Tập trung vào chi tiết vật liệu, texture, ánh sáng trên bề mặt
           - Góc máy gần, DOF mạnh, highlight chi tiết kiến trúc
        
        2. GÓC ĐIỆN ẢNH (Cinematic) - 2 prompts:
           - Ánh sáng dramatic, volumetric lighting, atmosphere
           - Composition điện ảnh, color grading film tone
        
        3. GÓC TUYẾN TRỤC (Eye-level) - 2 prompts:
           - Góc nhìn ngang tầm mắt người
           - Perspective tự nhiên, human scale
        
        ĐỊNH DẠNG TRẢ VỀ JSON:
        {
          "closeup": ["prompt 1", "prompt 2"],
          "cinematic": ["prompt 1", "prompt 2"],
          "eyeLevel": ["prompt 1", "prompt 2"]
        }
      `;

      const generateResult = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64MidShot,
              },
            },
            { text: "Đây là ảnh trung cảnh. Hãy phát triển các góc máy chi tiết." },
          ],
        }],
      });

      const responseText = generateResult.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format from AI");
      }
    } else {
      return withCorsHeaders(
        NextResponse.json({ error: "Invalid type. Use 'midshot' or 'detailed'" }, { status: 400 }),
        request
      );
    }

    // Deduct credits after successful generation (if not Pro)
    let remainingCredits = profile.credits;
    if (!isPro) {
      const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: CREDIT_COST,
      });

      if (!deductError) {
        remainingCredits = deductResult?.[0]?.remaining_credits ?? (profile.credits - CREDIT_COST);
      }
    }

    return withCorsHeaders(
      NextResponse.json({
        success: true,
        data: result,
        creditsUsed: isPro ? 0 : CREDIT_COST,
        creditsRemaining: isPro ? -1 : remainingCredits,
        isPro,
        creditsRemaining: profile.credits - 1,
      }),
      request
    );

  } catch (error) {
    console.error("Masterplan API error:", error);
    return withCorsHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      ),
      request
    );
  }
}
