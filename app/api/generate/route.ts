import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type ModeId = 'strict' | 'creative' | 'cinematic';

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
  }
];

export async function POST(request: NextRequest) {
  try {
    const { baseImages, refImage, mode } = await request.json();

    if (!baseImages || baseImages.length === 0 || !refImage || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const model = "gemini-2.5-flash";
    const base64Ref = refImage.split(',')[1];
    const modeConfig = MODES.find(m => m.id === mode);

    if (!modeConfig) {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    const allResults = [];

    for (const baseImg of baseImages) {
      const base64Base = baseImg.split(',')[1];

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

      console.log("[v0] Using model:", model, "Mode:", modeConfig.title);
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: model,
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const response = await geminiModel.generateContent([
        { text: systemInstruction },
        { inlineData: { mimeType: "image/png", data: base64Base } },
        { inlineData: { mimeType: "image/png", data: base64Ref } },
        { text: `Phân tích và trả về prompt cho chế độ ${modeConfig.title} dưới dạng JSON.` }
      ]);

      const responseText = response.response.text();
      console.log("[v0] Response received:", responseText?.substring(0, 100));
      
      let data;
      try {
        data = JSON.parse(responseText || "{}");
      } catch {
        // If JSON parsing fails, try to extract from response
        data = { prompt: responseText, vietnamese: "" };
      }
      allResults.push({
        baseImage: baseImg,
        prompt: data.prompt || "",
        vietnamese: data.vietnamese || ""
      });
    }

    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Error generating prompts:", error);
    return NextResponse.json(
      { error: "Failed to generate prompts" },
      { status: 500 }
    );
  }
}