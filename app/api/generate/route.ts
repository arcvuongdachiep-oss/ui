import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  checkRateLimit, 
  recordRequest, 
  addToQueue, 
  canStartProcessing, 
  startProcessing, 
  finishProcessing,
  getQueueStatus,
  QUEUE_CONFIG
} from "@/lib/queue";
import {
  isAllowedOrigin,
  withCorsHeaders,
  blockedResponse,
  sanitizeBase64Image,
  validateModeId,
} from "@/lib/security";

// Validate API Key exists
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini API (will be validated per request)
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

type ModeId = 'strict' | 'creative' | 'cinematic' | 'random';

interface ModeConfig {
  id: ModeId;
  title: string;
  instruction: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'strict',
    title: 'STRICT MODE',
    instruction: `
      🔒 STRICT MODE (KHÓA FORM TUYỆT ĐỐI)
      PHÂN TÍCH: Ảnh 1 = khung xương (giữ nguyên form). Ảnh 2 = lớp áo (ánh sáng, vật liệu).
      OUTPUT: Giữ hình khối Ảnh 1 + Áp style Ảnh 2.
      
      FORMAT PROMPT (mỗi dòng là 1 phần, dùng \\n ngắt dòng):
      - Subject: [loại công trình, đặc điểm chính]
      - Materials: [vật liệu chính, texture]
      - Lighting: [nguồn sáng, hướng, mood]
      - Camera: [góc, lens, DOF]
      - Environment: [bối cảnh, thời tiết]
      - Technical: strictly preserve massing, exact perspective, photorealistic, archviz, octane
      
      YÊU CẦU: Prompt NGẮN GỌN, chỉ từ khóa then chốt, không văn phong miêu tả dài.
    `
  },
  {
    id: 'creative',
    title: 'CREATIVE MODE',
    instruction: `
      ⚡ CREATIVE MODE (BIẾN ĐỔI CÓ KIỂM SOÁT)
      PHÂN TÍCH: Ảnh 1 = bố cục gốc (cho phép tinh chỉnh). Ảnh 2 = style nâng cấp.
      OUTPUT: Phiên bản upgrade - kiến trúc hơn, vật liệu đẹp hơn.
      
      FORMAT PROMPT (mỗi dòng là 1 phần, dùng \\n ngắt dòng):
      - Subject: [loại công trình, nâng cấp facade]
      - Materials: [vật liệu cao cấp, chi tiết]
      - Lighting: [cinematic, soft shadows]
      - Camera: [optimized framing, lens]
      - Environment: [realistic context]
      - Technical: preserve composition, refined geometry, enhanced detailing, improved realism
      
      YÊU CẦU: Prompt NGẮN GỌN, chỉ từ khóa then chốt, không văn phong miêu tả dài.
    `
  },
  {
    id: 'cinematic',
    title: 'CINEMATIC MODE',
    instruction: `
      🎬 CINEMATIC MODE (ĐIỆN ẢNH - CẢM XÚC)
      PHÂN TÍCH: Ảnh 1 = silhouette công trình. Ảnh 2 = mood điện ảnh.
      OUTPUT: Film still kiến trúc - ánh sáng dẫn dắt, atmosphere tạo chiều sâu.
      
      FORMAT PROMPT (mỗi dòng là 1 phần, dùng \\n ngắt dòng):
      - Subject: [công trình, storytelling element]
      - Materials: [phục vụ mood, reflective]
      - Lighting: [dramatic, backlight, rim light, volumetric]
      - Camera: [cinematic angle, DOF, anamorphic]
      - Atmosphere: [fog, dust particles, god rays]
      - Technical: cinematic contrast, film grain, emotional impact, dynamic shadows
      
      YÊU CẦU: Prompt NGẮN GỌN, chỉ từ khóa then chốt, không văn phong miêu tả dài.
    `
  },
  {
    id: 'random',
    title: 'RANDOM ANGLE',
    instruction: `
      🎲 RANDOM ANGLE (3 GÓC KHÁC NHAU)
      NHIỆM VỤ: Tạo 3 prompt cho cùng công trình với 3 góc:
      - Medium Shot: cân bằng kiến trúc + môi trường
      - Close-up: chi tiết vật liệu, texture
      - Cinematic: góc cảm xúc, ánh sáng nghệ thuật, DOF
      
      FORMAT MỖI PROMPT (dùng \\n ngắt dòng):
      - Subject: [mô tả ngắn]
      - Materials: [vật liệu]
      - Lighting: [ánh sáng]
      - Camera: [góc, lens]
      - Environment: [bối cảnh]
      
      YÊU CẦU: Mỗi prompt NGẮN GỌN, chỉ từ khóa, không văn phong dài.
    `
  }
];

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return blockedResponse();
  }
  return withCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

export async function POST(request: NextRequest) {
  try {
    // CORS check
    if (!isAllowedOrigin(request)) {
      return blockedResponse();
    }

    // Check if API Key is configured
    if (!genAI || !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Thiếu API Key trong thiết lập. Vui lòng liên hệ quản trị viên." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng này" },
        { status: 401 }
      );
    }

    // Check rate limit (2 requests per 3 minutes)
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: `Bạn đã đạt giới hạn ${QUEUE_CONFIG.RATE_LIMIT_MAX} lượt trong ${QUEUE_CONFIG.RATE_LIMIT_WINDOW / 60} phút. Vui lòng đợi ${rateLimit.resetIn} giây.`,
        rateLimited: true,
        resetIn: rateLimit.resetIn,
      }, { status: 429 });
    }

    // Check queue status
    const queueStatus = getQueueStatus();
    if (queueStatus.queueLength >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      return NextResponse.json({
        error: "Máy chủ đang quá tải, vui lòng quay lại sau vài phút.",
        serverBusy: true,
        queueLength: queueStatus.queueLength,
      }, { status: 503 });
    }

    // Add to queue
    const queueResult = addToQueue(user.id);
    if (!queueResult.success) {
      return NextResponse.json({
        error: "Máy chủ đang quá tải, vui lòng quay lại sau vài phút.",
        serverBusy: true,
      }, { status: 503 });
    }

    // Wait for turn to process
    let waitAttempts = 0;
    const maxWaitAttempts = 30; // 30 seconds max wait
    while (!canStartProcessing(user.id) && waitAttempts < maxWaitAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitAttempts++;
    }

    if (!canStartProcessing(user.id)) {
      finishProcessing(user.id);
      return NextResponse.json({
        error: "Hết thời gian chờ trong hàng đợi. Vui lòng thử lại.",
        timeout: true,
      }, { status: 408 });
    }

    // Start processing
    if (!startProcessing(user.id)) {
      return NextResponse.json({
        error: "Không thể bắt đầu xử lý. Vui lòng thử lại.",
      }, { status: 500 });
    }

    // Record this request for rate limiting
    recordRequest(user.id);

    const body = await request.json();
    const { baseImages, refImage, mode, userDetails } = body;

    // Validate mode
    if (!validateModeId(mode)) {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    // Validate and sanitize images
    if (!Array.isArray(baseImages) || baseImages.length === 0 || baseImages.length > 4) {
      return NextResponse.json(
        { error: "Invalid base images (1-4 images required)" },
        { status: 400 }
      );
    }

    const sanitizedBaseImages = baseImages
      .map(img => sanitizeBase64Image(img))
      .filter((img): img is string => img !== null);

    if (sanitizedBaseImages.length !== baseImages.length) {
      return NextResponse.json(
        { error: "Invalid image format detected" },
        { status: 400 }
      );
    }

    // Reference image is optional for random mode
    const isRandomMode = mode === 'random';
    const sanitizedRefImage = refImage ? sanitizeBase64Image(refImage) : null;
    if (!isRandomMode && !sanitizedRefImage) {
      return NextResponse.json(
        { error: "Invalid reference image" },
        { status: 400 }
      );
    }

    const imageCount = sanitizedBaseImages.length;

    // Get user profile to check credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin người dùng" },
        { status: 404 }
      );
    }

    // Check credits (Pro users have unlimited)
    const isPro = profile.role === "pro";
    if (!isPro && profile.credits < imageCount) {
      return NextResponse.json({
        error: `Bạn cần ${imageCount} lượt để thực hiện, nhưng chỉ còn ${profile.credits} lượt. Vui lòng nâng cấp Pro.`,
        needUpgrade: true,
        required: imageCount,
        available: profile.credits,
      }, { status: 400 });
    }

    const model = "gemini-2.5-flash";
    const base64Ref = sanitizedRefImage ? sanitizedRefImage.split(',')[1] : null;
    const modeConfig = MODES.find(m => m.id === mode);

    if (!modeConfig) {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    const allResults: Array<{baseImage: string; prompt: string; vietnamese: string; label?: string}> = [];

    for (const baseImg of sanitizedBaseImages) {
      const base64Base = baseImg.split(',')[1];

      const geminiModel = genAI.getGenerativeModel({ 
        model: model,
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      if (isRandomMode) {
        // Random mode: generate 3 different angles
        // Build user specifics string
        const userSpecifics = userDetails ? `\nINCLUDE USER SPECIFICS: ${userDetails}` : '';
        
        const systemInstruction = `
          BẠN LÀ ĐẠO DIỄN HÌNH ẢNH (DoP) KIẾN TRÚC. 
          NHIỆM VỤ: TẠO 3 PROMPT (TRUNG CẢNH, CẬN CẢNH, CINEMATIC).
          ${base64Ref ? 'Dùng ảnh Style lấy ánh sáng, vật liệu.' : 'Tự đề xuất style chuyên nghiệp.'}
          ${userSpecifics}

          ${modeConfig.instruction}

          QUAN TRỌNG - FORMAT OUTPUT:
          - Mỗi prompt dùng \\n để ngắt dòng giữa các phần (Subject, Materials, Lighting, Camera, Environment)
          - Prompt phải NGẮN GỌN, chỉ từ khóa then chốt, KHÔNG văn phong miêu tả dài dòng
          - Ví dụ format: "Subject: modern villa, white facade\\nMaterials: exposed concrete, glass curtain wall\\nLighting: golden hour, soft shadows..."

          ĐỊNH DẠNG JSON:
          [
            { "label": "Medium Shot", "prompt": "...", "vietnamese": "..." },
            { "label": "Close-up", "prompt": "...", "vietnamese": "..." },
            { "label": "Cinematic", "prompt": "...", "vietnamese": "..." }
          ]
        `;

        const parts: Array<{text: string} | {inlineData: {mimeType: string; data: string}}> = [
          { text: systemInstruction },
          { inlineData: { mimeType: "image/png", data: base64Base } }
        ];

        if (base64Ref) {
          parts.push({ inlineData: { mimeType: "image/png", data: base64Ref } });
        }

        parts.push({ text: `Phân tích và trả về 3 prompt cho chế độ ${modeConfig.title} dưới dạng JSON array.` });

        const response = await geminiModel.generateContent(parts);
        const responseText = response.response.text();
        
        try {
          const data = JSON.parse(responseText || "[]");
          if (Array.isArray(data)) {
            data.forEach((item: {label?: string; prompt?: string; vietnamese?: string}) => {
              allResults.push({
                baseImage: baseImg,
                prompt: item.prompt || "",
                vietnamese: item.vietnamese || "",
                label: item.label
              });
            });
          }
        } catch {
          allResults.push({
            baseImage: baseImg,
            prompt: responseText || "",
            vietnamese: ""
          });
        }
      } else {
        // Standard modes: generate single prompt
        // Build user specifics string
        const userSpecificsStd = userDetails ? `\nINCLUDE USER SPECIFICS: ${userDetails}` : '';
        
        const systemInstruction = `
          BẠN LÀ ĐẠO DIỄN HÌNH ẢNH (DoP) KIẾN TRÚC.
          NHIỆM VỤ: TẠO PROMPT DỰA TRÊN ẢNH BASE + ẢNH STYLE.
          ${userSpecificsStd}

          ${modeConfig.instruction}

          QUAN TRỌNG - FORMAT OUTPUT:
          - Dùng \\n để ngắt dòng giữa các phần (Subject, Materials, Lighting, Camera, Environment, Technical)
          - Prompt phải NGẮN GỌN, chỉ từ khóa then chốt, KHÔNG văn phong miêu tả dài dòng
          - Ví dụ: "Subject: luxury resort, infinity pool\\nMaterials: natural stone, teak wood\\nLighting: sunset, warm tones..."

          ĐỊNH DẠNG JSON:
          {
            "prompt": "...",
            "vietnamese": "..."
          }
        `;

        const parts: Array<{text: string} | {inlineData: {mimeType: string; data: string}}> = [
          { text: systemInstruction },
          { inlineData: { mimeType: "image/png", data: base64Base } }
        ];

        if (base64Ref) {
          parts.push({ inlineData: { mimeType: "image/png", data: base64Ref } });
        }

        parts.push({ text: `Phân tích và trả về prompt cho chế độ ${modeConfig.title} dưới dạng JSON.` });

        const response = await geminiModel.generateContent(parts);
        const responseText = response.response.text();
        
        let data;
        try {
          data = JSON.parse(responseText || "{}");
        } catch {
          data = { prompt: responseText, vietnamese: "" };
        }
        allResults.push({
          baseImage: baseImg,
          prompt: data.prompt || "",
          vietnamese: data.vietnamese || ""
        });
      }
    }

    // Deduct credits after successful generation (if not Pro)
    let remainingCredits = profile.credits;
    if (!isPro) {
      const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: imageCount,
      });

      if (!deductError) {
        remainingCredits = deductResult?.[0]?.remaining_credits ?? (profile.credits - imageCount);
      }
    }

    // Finish processing
    finishProcessing(user.id);

    return withCorsHeaders(NextResponse.json({ 
      results: allResults,
      creditsUsed: isPro ? 0 : imageCount,
      remainingCredits: isPro ? -1 : remainingCredits,
      isPro,
    }), request);
  } catch (error) {
    // Make sure to finish processing on error too
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        finishProcessing(user.id);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    return NextResponse.json(
      { error: "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
