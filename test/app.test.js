import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
const post = (base, messages) => fetch(`${base}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages })
});

test('대화 전체, 서버 시스템 지침, 지정 모델을 전달한다', async () => {
  const messages = [
    { role: 'user', content: '내 이름은 민수야.' },
    { role: 'assistant', content: '반가워요, 민수님.' },
    { role: 'user', content: '내 이름이 뭐야?' }
  ];
  await withServer({ apiKey: () => 'test-key', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.store, false);
    assert.equal(body.messages[0].role, 'system');
    assert.deepEqual(body.messages.slice(1), messages);
    return Response.json({ choices: [{ message: { content: '민수님이에요.' } }] });
  } }, async base => {
    const response = await post(base, messages);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: '민수님이에요.' });
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /미니챗/);
  });
});

test('잘못된 역할, 순서, 길이, 빈 메시지는 API 호출 전에 거부한다', async () => {
  await withServer({ fetchImpl: () => { throw new Error('Must not call upstream'); } }, async base => {
    for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'user', content: ' ' }],
      [{ role: 'assistant', content: 'hello' }], [{ role: 'user', content: 'x'.repeat(6001) }]]) {
      assert.equal((await post(base, messages)).status, 400);
    }
    const malformed = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
  });
});

test('누락된 키와 상위 API 오류를 안전한 오류로 반환한다', async () => {
  const messages = [{ role: 'user', content: '안녕' }];
  await withServer({ apiKey: () => undefined }, async base => {
    assert.equal((await post(base, messages)).status, 503);
  });
  for (const upstreamStatus of [401, 429, 500]) {
    await withServer({ apiKey: () => 'secret', fetchImpl: async () => new Response('sensitive upstream detail', { status: upstreamStatus }) }, async base => {
      const response = await post(base, messages);
      assert.equal(response.status, upstreamStatus === 429 ? 429 : 502);
      assert.doesNotMatch(await response.text(), /secret|sensitive/);
    });
  }
  await withServer({ apiKey: () => 'test-key', fetchImpl: async () => Response.json({ choices: [] }) }, async base => {
    assert.equal((await post(base, messages)).status, 502);
  });
});
