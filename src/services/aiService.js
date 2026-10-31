import { callGemini } from './gemini';
import { callOpenAI } from './openai';

const SYSTEM_PROMPT = `คุณเป็น Content Creator ระดับท็อปสายป้ายยาบน TikTok, Reels, Shopee Video และ YouTube Shorts
หน้าที่ของคุณคือคิดบทพูดพากย์วิดีโอ 8 วินาที ที่มี "ชีวิตชีวา สนุกสนาน ตื่นเต้น เป็นธรรมชาติ เหมือนคุยเม้าท์มอยป้ายยากับเพื่อนสนิท"

⚠️ ข้อห้ามเด็ดขาด:
- ห้ามเขียนเหมือนภาษาอ่านหนังสือ หรือบทความวิชาการ
- ห้ามใช้คำทางการ เช่น "ขอแนะนำผลิตภัณฑ์นี้", "มีคุณสมบัติดังต่อไปนี้"

✅ สิ่งที่ต้องทำ:
- ใช้ภาษาพูดแบบคนจริงๆ พูด (เช่น "แกรรร", "อันนี้คือดีย์มากกก", "โคตรคุ้ม", "อย่าเพิ่งเลื่อนผ่านนะ!", "พิกัดในตะกร้าซ้ายล่างด่วน!")
- ความยาวบทพากย์ประมาณ 18-24 คำ เพื่อให้พูดจบใน 8 วินาทีแบบกระฉับกระเฉง พลังงานสูง`;

export async function generateProductScript(product, templateType, settings) {
  const { aiProvider, geminiApiKey, geminiModel, openaiApiKey, openaiModel } = settings;

  let templatePrompt = '';

  if (templateType === '8s-viral') {
    templatePrompt = `วิเคราะห์สินค้า Shopee ชิ้นนี้:
ชื่อสินค้า: ${product.title}
ราคาปัจจุบัน: ${product.currentPrice} (ราคาเดิม: ${product.originalPrice || 'ไม่มี'}, ส่วนลด: ${product.discount || 'ไม่มี'})
คะแนนรีวิว: ${product.rating || '4.9'} ดาว (ขายแล้ว ${product.soldCount || 'หลายร้อย'} ชิ้น)
จุดเด่นคร่าวๆ: ${product.description ? product.description.slice(0, 400) : 'ไม่มี'}

จงสร้างบทสคริปต์ 8 วินาที ที่มีชีวิตชีวา ตื่นเต้น สไตล์ TikTok Creator ตอบกลับเป็น JSON ใน code block \`\`\`json ... \`\`\` ดังนี้:
{
  "hookText": "คำ Hook สั้นๆ ขึ้นตัวหนังสือบนจอไม่เกิน 25 ตัวอักษร เช่น แกรรร สิ่งนี้คือชีวิตเปลี่ยน!",
  "highlightText": "จุดเด่นสั้นๆ ขึ้นจอ เช่น ลดเหลือ ${product.currentPrice} โคตรคุ้ม",
  "priceText": "${product.currentPrice || '฿299'}",
  "discountText": "${product.discount || 'ลดพิเศษ'}",
  "ctaText": "จิ้มตะกร้าเหลืองด่วน!",
  "voiceoverScript": "บทพูดพากย์สดความยาว 8 วินาที (18-22 คำ) ภาษาพูดเม้าท์มอยป้ายยาเพื่อนสนิท มีอารมณ์ตื่นเต้น เช่น 'แกรรร! อย่าเพิ่งเลื่อนผ่าน ตัวนี้คือโคตรดี ลดเหลือแค่ ${product.currentPrice} รีบจิ้มตะกร้าซ้ายล่างด่วนเลย!'",
  "caption": "แคปชั่นสายป้ายยา TikTok + แฮชแท็กติดเทรนด์ 5-8 แท็ก"
}
หลังจาก JSON ให้เขียนทิปส์การพูดสั้นๆ`;
  } else if (templateType === '8s-flashsale') {
    templatePrompt = `วิเคราะห์สินค้า Shopee ชิ้นนี้:
ชื่อสินค้า: ${product.title}
ราคาปัจจุบัน: ${product.currentPrice} (ราคาเดิม: ${product.originalPrice || 'ไม่มี'}, ส่วนลด: ${product.discount || 'ไม่มี'})

จงสร้างบทแบบ Flash Sale เร่งด่วน พลังงานสูงปรี๊ด 8 วินาที ตอบกลับเป็น JSON:
{
  "hookText": "ช้อปปี้ลดโหดมาก!",
  "highlightText": "เหลือแค่ ${product.currentPrice} ส่งฟรีวันนี้",
  "priceText": "${product.currentPrice}",
  "discountText": "${product.discount || 'Flash Sale'}",
  "ctaText": "รีบกดตะกร้าก่อนโค้ดหมด!",
  "voiceoverScript": "บทพูดพากย์สดสายเร่งด่วนตื่นเต้น (18-22 คำ) เช่น 'ทุกคนนน! ช้อปปี้ลดโหดมาก เหลือแค่ ${product.currentPrice} ส่งฟรีด้วย รีบจิ้มตะกร้าก่อนของหมดด่วน!'",
  "caption": "แคปชั่น Flash Sale + แฮชแท็ก"
}`;
  } else if (templateType === 'prompts-kling') {
    templatePrompt = `วิเคราะห์สินค้า Shopee: ${product.title}
สร้าง Storyboard & Prompts สำหรับเจนวิดีโอ 8 วินาทีด้วย Kling AI / Runway Gen-3 แบ่ง 2 ฉาก (ฉากละ 4 วินาที) พร้อม Prompt ภาษาอังกฤษ`;
  }

  if (aiProvider === 'openai') {
    return await callOpenAI({
      apiKey: openaiApiKey,
      model: openaiModel,
      prompt: templatePrompt,
      systemInstruction: SYSTEM_PROMPT
    });
  } else {
    return await callGemini({
      apiKey: geminiApiKey,
      model: geminiModel,
      prompt: templatePrompt,
      systemInstruction: SYSTEM_PROMPT
    });
  }
}

export async function chatWithAI(messages, currentProduct, settings) {
  const { aiProvider, geminiApiKey, geminiModel, openaiApiKey, openaiModel } = settings;

  const productContext = currentProduct ? `
[ข้อมูลสินค้าปัจจุบัน]
ชื่อ: ${currentProduct.title}
ราคา: ${currentProduct.currentPrice}
ส่วนลด: ${currentProduct.discount || '-'}
ร้าน: ${currentProduct.shopName || '-'}
  ` : '';

  const fullPrompt = `${productContext}

บทสนทนา:
${messages.map(m => `${m.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${m.content}`).join('\n')}
ผู้ใช้: ${messages[messages.length - 1].content}
AI:`;

  if (aiProvider === 'openai') {
    return await callOpenAI({
      apiKey: openaiApiKey,
      model: openaiModel,
      prompt: fullPrompt,
      systemInstruction: SYSTEM_PROMPT
    });
  } else {
    return await callGemini({
      apiKey: geminiApiKey,
      model: geminiModel,
      prompt: fullPrompt,
      systemInstruction: SYSTEM_PROMPT
    });
  }
}

export function parseScriptJSON(responseText) {
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*"hookText"[\s\S]*\}/);
    if (jsonMatch) {
      const rawJson = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(rawJson);
    }
  } catch (e) {
    console.warn('Failed to parse script JSON from AI response:', e);
  }
  return null;
}
