# 미니챗

HTML, CSS, JavaScript와 Node.js / Express 기반 AI 챗봇입니다. OpenAI Chat Completions API의 `gpt-4o-mini`를 사용합니다.

## 로컬 실행

Node.js 24 LTS를 설치한 뒤 프로젝트 폴더에서 실행하세요. Windows PowerShell에서 npm 실행 정책 오류가 발생하면 `npm` 대신 `npm.cmd`를 사용하세요.

```powershell
npm.cmd install
Copy-Item .env.example .env
# .env의 OPENAI_API_KEY에 본인의 API 키 입력
npm.cmd run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 일반 실행은 `npm.cmd start`입니다. API 키는 `.env` 또는 서버 환경변수에만 설정하고 커밋하지 마세요.

## Vercel 배포

1. 이 프로젝트를 GitHub 저장소에 올립니다. `.env`와 `node_modules`는 제외됩니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다.
3. Framework Preset은 **Express**, Node.js Version은 **24.x**를 선택합니다. Build Command와 Output Directory는 기본값으로 둡니다.
4. Environment Variables에 `OPENAI_API_KEY`를 추가합니다. 필요한 Production / Preview 환경에 각각 적용합니다.
5. Deploy를 누릅니다. 키를 변경했다면 다시 배포합니다.

Vercel이 루트 `app.js`의 기본 export를 Express 함수로 인식합니다. `public/`의 HTML/CSS/JS와 `/api/chat`을 같은 주소에서 제공합니다. 로컬 포트 리스너는 `local.js`에 분리했습니다.

## 대화 처리

- 브라우저 메모리의 `history` 배열에 성공한 사용자/AI 대화를 저장합니다. 새로고침, 탭 종료, 새 대화 버튼으로 초기화합니다. DB, 쿠키, localStorage를 사용하지 않습니다.
- 매 요청에 이전 대화와 새 질문을 함께 전송합니다. 서버는 시스템 메시지를 추가하고 OpenAI API를 호출합니다. 서버 인스턴스에 대화를 저장하지 않으므로 Vercel의 서버리스 실행에서도 동작합니다.
- 질문은 6,000자까지, 요청 기록은 최대 101개 메시지 / 총 100,000자까지 허용합니다. 한도에 도달하면 새 대화가 필요합니다. 출력은 최대 1,500토큰입니다.
- API 오류가 발생하면 질문을 입력창에 복원합니다. 중복 전송을 막고, 모델 출력은 `textContent`로 표시합니다.
- 앱은 DB를 사용하지 않지만 답변 생성에 필요한 대화는 OpenAI로 전송됩니다. `store: false`는 OpenAI의 일반 데이터 보존 정책과 별개입니다.

## 검증

```powershell
npm.cmd test
```

테스트는 모의 OpenAI 응답으로 대화 전달, 모델 지정, 입력 검증, 오류 처리와 정적 페이지 제공을 확인합니다. 실제 API 호출에는 유효한 키와 API 잔액이 필요합니다.

이 예제는 인증 없는 간단한 데모입니다. 공개 URL에 접근한 사용자가 API를 호출할 수 있습니다. 여러 사용자에게 운영할 때는 인증과 공유 저장소 기반 사용량 제한을 추가하세요.

공식 문서: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
