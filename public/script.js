const form = document.querySelector('#chat-form');
const input = document.querySelector('#input');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
const log = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const status = document.querySelector('#status');
let history = [];
let busy = false;

function appendMessage(role, content, pending = false) {
  const row = document.createElement('div');
  row.className = `message ${role}${pending ? ' pending' : ''}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '나' : '✳';
  avatar.setAttribute('aria-hidden', 'true');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  row.append(avatar, bubble);
  log.append(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return row;
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}
input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!busy) form.requestSubmit();
  }
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (busy || !content) return;
  const next = [...history, { role: 'user', content }];
  if (next.length > 101 || next.reduce((sum, m) => sum + m.content.length, 0) > 100000) {
    status.textContent = '대화가 길어졌습니다. 새 대화를 시작해 주세요.';
    return;
  }
  busy = true;
  send.disabled = reset.disabled = input.disabled = true;
  document.querySelectorAll('[data-prompt]').forEach(button => button.disabled = true);
  status.textContent = '';
  welcome.hidden = true;
  const userRow = appendMessage('user', content);
  input.value = '';
  resizeInput();
  const pending = appendMessage('assistant', '생각을 정리하고 있어요…', true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }), signal: AbortSignal.timeout(55000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '응답을 받지 못했습니다.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('응답이 비어 있습니다. 다시 시도해 주세요.');
    history = [...next, { role: 'assistant', content: data.reply }];
    appendMessage('assistant', data.reply);
  } catch (error) {
    userRow.remove();
    input.value = content;
    resizeInput();
    status.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 보내 주세요.' : error instanceof TypeError ? '네트워크 연결을 확인해 주세요.' : error.message;
    welcome.hidden = history.length > 0;
  } finally {
    pending.remove();
    busy = false;
    send.disabled = reset.disabled = input.disabled = false;
    document.querySelectorAll('[data-prompt]').forEach(button => button.disabled = false);
    input.focus();
  }
});
reset.addEventListener('click', () => {
  if (busy) return;
  history = [];
  log.replaceChildren();
  welcome.hidden = false;
  status.textContent = '';
  input.value = '';
  resizeInput();
  input.focus();
});
document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => {
    if (busy) return;
    input.value = button.dataset.prompt;
    form.requestSubmit();
  });
});
