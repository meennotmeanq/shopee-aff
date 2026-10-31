// OpenAI API Client

export async function callOpenAI({ apiKey, model = 'gpt-4o-mini', prompt, systemInstruction = '' }) {
  if (!apiKey) {
    throw new Error('กรุณาระบุ OpenAI API Key ในหน้าการตั้งค่า (Settings)');
  }

  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `OpenAI API Error (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

