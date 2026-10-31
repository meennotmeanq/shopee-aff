// Google Gemini API Client

export async function callGemini({ apiKey, model = 'gemini-3.8-flash', prompt, systemInstruction = '', images = [] }) {
  if (!apiKey) {
    throw new Error('กรุณาระบุ Gemini API Key ในหน้าการตั้งค่า (Settings)');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  const parts = [];

  // Add text prompt
  parts.push({ text: prompt });

  // Add system instruction if provided
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gemini API Error (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  return text;
}

