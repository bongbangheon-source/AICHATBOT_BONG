import express from 'express';
import { fileURLToPath } from 'node:url';

export function createApp({ fetchImpl = globalThis.fetch, apiKey = () => process.env.OPENAI_API_KEY } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.post('/api/chat', async (req, res) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 101 ||
        messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
          typeof m.content !== 'string' || !m.content.trim() || m.content.length > 6000) ||
        messages.at(-1)?.role !== 'user' ||
        messages.reduce((sum, m) => sum + m.content.length, 0) > 100000) {
      return res.status(400).json({ error: '대화 형식 또는 길이가 올바르지 않습니다. 새 대화를 시작해 주세요.' });
    }
    const key = apiKey();
    if (!key || key === 'your_openai_api_key_here') {
      return res.status(503).json({ error: '서버에 OPENAI_API_KEY를 설정해 주세요.' });
    }
    try {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: '당신은 친절하고 정확한 AI 도우미입니다. 이전 대화의 맥락을 반영하고, 사용자의 언어로 답하세요. 모르는 내용은 솔직하게 말하세요.' }, ...messages],
          max_completion_tokens: 1500,
          store: false
        })
      });
      if (!response.ok) {
        const error = response.status === 429 ? 'API 사용 한도에 도달했습니다. 잠시 후 다시 시도하거나 API 잔액을 확인해 주세요.' :
          response.status === 401 ? '서버의 OpenAI API 키를 확인해 주세요.' : 'AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return res.status(response.status === 429 ? 429 : 502).json({ error });
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty response');
      return res.json({ reply });
    } catch (error) {
      return res.status(502).json({ error: error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : 'AI 응답을 받지 못했습니다. 다시 시도해 주세요.' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API 경로를 찾을 수 없습니다.' }));
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
  app.use((error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 413 ? '대화가 너무 깁니다. 새 대화를 시작해 주세요.' : status === 400 ? '올바른 JSON 요청이 필요합니다.' : '서버 오류가 발생했습니다.' });
  });
  return app;
}

export default createApp();
