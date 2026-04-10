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
      🔒 TRƯỜNG HỢP 1 – STRICT MODE (KHÓA FORM TUYỆT ĐỐI)
      ĐẶC TÍNH: Bạn là một Đạo diễn Hình ảnh (DoP) Huyền thoại. Bạn "xây dựng" và "đắp vật liệu" bằng ngôn ngữ.
      QUY TRÌNH PHÂN TÍCH:
      1. Bóc tách Ảnh 1 (Base Model – Khung xương): Phân tích cấu trúc không gian, góc camera, hình khối chính. MỤC TIÊU: Giữ nguyên tuyệt đối "form" công trình.
      2. Bóc tách Ảnh 2 (Reference – Lớp áo & Cảm xúc): Trích xuất phong cách, ánh sáng, tông ảnh. KHÔNG lấy hình khối từ ảnh này.
      BẢN CHẤT OUTPUT: Lấy hình khối từ Ảnh 1 + Áp ánh sáng và vật liệu từ Ảnh 2.
      YÊU CẦU PROMPT (5 yếu tố): Chủ đề, Vật liệu chi tiết, Ánh sáng (QUAN TRỌNG NHẤT), Camera & Phong cách, Môi trường.
      THAM SỐ BẮT BUỘC: "strictly preserve the original architectural massing, maintain exact camera perspective, no redesign, no geometry alteration, identical viewpoint as the base image, photorealistic, masterpiece, high-end archviz, architectural photography, ultra-detailed, unreal engine 5 rendering style, octane render, ray tracing"
    `
  },
  {
    id: 'creative',
    title: 'CREATIVE MODE',
    instruction: `
      ⚡ TRƯỜNG HỢP 2 – CREATIVE MODE (BIẾN ĐỔI CÓ KIỂM SOÁT)
      ĐẶC TÍNH: Bạn là một Đạo diễn Hình ảnh (DoP) Huyền thoại. Bạn nâng cấp công trình dựa trên cấu trúc gốc.
      QUY TRÌNH PHÂN TÍCH:
      1. Bóc tách Ảnh 1 (Base Model – Khung xương linh hoạt): Phân tích loại công trình, góc camera, hình khối chính. MỤC TIÊU: Giữ bố cục chính, cho phép làm sạch hình khối, tinh chỉnh tỷ lệ, tối ưu facade.
      2. Bóc tách Ảnh 2 (Reference – Lớp áo nâng cấp): Trích xuất ánh sáng cinematic, vật liệu cao cấp, color grading.
      BẢN CHẤT OUTPUT: Phiên bản "upgrade" của thiết kế gốc: Kiến trúc hơn, vật liệu đẹp hơn, ánh sáng sâu hơn.
      YÊU CẦU PROMPT: Chủ đề (nâng cấp), Vật liệu cao cấp, Ánh sáng cinematic nhẹ, Camera tối ưu framing, Môi trường tăng realism.
      THAM SỐ BẮT BUỘC: "preserve overall architectural composition", "refined geometry and enhanced facade detailing", "slight artistic enhancement allowed", "improved material definition and realism"
    `
  },
  {
    id: 'cinematic',
    title: 'CINEMATIC MODE',
    instruction: `
      🎬 TRƯỜNG HỢP 3 – CINEMATIC MODE (BIẾN ĐỔI MẠNH – BÁN CẢM XÚC)
      ĐẶC TÍNH: Bạn là một Đạo diễn điện ảnh. Bạn kể câu chuyện bằng ánh sáng. Công trình là "diễn viên", ánh sáng là "linh hồn".
      QUY TRÌNH PHÂN TÍCH:
      1. Bóc tách Ảnh 1 (Base Model – Nhận diện): Phân tích loại công trình, hình khối. MỤC TIÊU: Giữ nhận diện, cho phép chỉnh framing, tăng chiều sâu, làm mạnh silhouette.
      2. Bóc tách Ảnh 2 (Reference – Cảm xúc điện ảnh): Trích xuất lighting mạnh (backlight, rim light, volumetric), atmosphere (sương mù, bụi sáng), color grading film tone.
      BẢN CHẤT OUTPUT: Một "film still kiến trúc". Ánh sáng dẫn dắt mắt nhìn, không khí tạo chiều sâu.
      YÊU CẦU PROMPT: Chủ đề (storytelling), Vật liệu phục vụ mood, Ánh sáng cinematic kịch tính, Camera góc điện ảnh (DOF, lens), Môi trường hiệu ứng.
      THAM SỐ BẮT BUỘC: "cinematic lighting with dramatic contrast", "volumetric light rays and atmospheric depth", "moody environment with strong storytelling", "film still composition, emotional impact", "dynamic shadows and reflective surfaces"
    `
  },
  {
    id: 'random',
    title: 'RANDOM ANGLE',
    instruction: `
      🎲 TRƯỜNG HỢP 4 – RANDOM ANGLE (PHÁT TRIỂN GÓC NGẪU NHIÊN)
      ĐẶC TÍNH: Bạn là một Nhiếp ảnh gia kiến trúc chuyên nghiệp.
      NHIỆM VỤ: Tạo ra 3 bộ prompt khác nhau cho cùng một công trình:
      - GÓC 1: Trung cảnh (Medium Shot) - Cân bằng giữa kiến trúc và môi trường.
      - GÓC 2: Cận cảnh (Close-up) - Đặc tả vật liệu và chi tiết tinh xảo.
      - GÓC 3: Cinematic - Góc nhìn đầy cảm xúc, ánh sáng nghệ thuật, chiều sâu trường ảnh (DOF).
      YÊU CẦU: Trình bày rõ ràng 3 góc này trong kết quả.
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
    const { baseImages, refImage, mode } = body;

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
        const systemInstruction = `
          BẠN LÀ MỘT ĐẠO DIỄN HÌNH ẢNH (DoP) CHUYÊN VỀ DIỄN HỌA KIẾN TRÚC. 
          NHIỆM VỤ: TẠO RA 3 BỘ PROMPT KHÁC NHAU (TRUNG CẢNH, CẬN CẢNH, CINEMATIC) DỰA TRÊN ẢNH BASE.
          ${base64Ref ? 'Sử dụng ảnh Style để lấy phong cách, ánh sáng và vật liệu.' : 'Vì không có ảnh Style, hãy tự đề xuất phong cách, ánh sáng và vật liệu chuyên nghiệp, sang trọng và thực tế nhất cho công trình.'}

          ${modeConfig.instruction}

          ĐỊNH DẠNG TRẢ VỀ JSON LÀ MỘT MẢNG GỒM 3 ĐỐI TƯỢNG:
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
        const systemInstruction = `
          BẠN LÀ MỘT ĐẠO DIỄN HÌNH ẢNH (DoP) CHUYÊN VỀ DIỄN HỌA KIẾN TRÚC. 
          NHIỆM VỤ: TẠO RA PROMPT DUY NHẤT DỰA TRÊN ẢNH BASE VÀ ẢNH STYLE THEO KỊCH BẢN SAU:

          ${modeConfig.instruction}

          ĐỊNH DẠNG TRẢ VỀ JSON:
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
