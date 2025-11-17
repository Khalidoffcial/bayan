// 📁 claudeDao.js

const API_KEY = 'AIzaSyB5VuglGcFix6njh-bIpcxBcqGdgOUnzmo'; // ✏️ حط المفتاح بتاعك هنا

/**
 * Send prompt to Claude 3 via OpenRouter and return the response
 * @param {string} prompt - النص اللي عايز تبعته
 * @returns {Promise<string>} - الرد من Claude
 */
export const sendToClaude = async (prompt) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '🚫 مفيش رد متاح من Claude.';
  } catch (error) {
    console.error('Claude API Error:', error);
    return '🚫 حصل خطأ أثناء الاتصال بـ Claude API.';
  }
};
