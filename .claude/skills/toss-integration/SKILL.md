---
name: toss-integration
description: 나솔팬즈 Node.js 백엔드 서버 구축 및 토스 API 연동 가이드. mTLS 인증서 설정, 토스 로그인 OAuth 플로우 구현, 토스 푸시 알림 API 호출, Supabase Admin 유저 생성. 백엔드 서버 구축, 토스 로그인 연동, 토스 푸시 알림 구현, mTLS 설정 요청 시 반드시 이 스킬을 사용할 것. 기존 서버 수정, 토스 API 오류 대응, 인증서 갱신 작업도 포함.
---

# Toss API 연동 가이드

나솔팬즈 백엔드 서버 구축 및 토스 API 연동 패턴.

## 서버 구조

```
backend/
├── src/
│   ├── index.ts          # Express 서버 진입점
│   ├── toss/
│   │   ├── auth.ts       # 토스 로그인 OAuth 처리
│   │   └── push.ts       # 토스 푸시 알림 발송
│   ├── supabase/
│   │   └── admin.ts      # Supabase Admin 클라이언트
│   └── middleware/
│       └── mtls.ts       # mTLS 설정
├── .env
├── package.json
└── tsconfig.json
```

## mTLS 서버 설정

```typescript
// src/index.ts
import https from 'https';
import fs from 'fs';
import express from 'express';

const app = express();
app.use(express.json());

const server = https.createServer({
  key: fs.readFileSync(process.env.CERT_KEY_PATH!),
  cert: fs.readFileSync(process.env.CERT_PATH!),
  // 토스 서버의 CA 인증서 (토스 콘솔에서 제공)
  ca: fs.readFileSync(process.env.TOSS_CA_PATH!),
  requestCert: true,
  rejectUnauthorized: true,
}, app);

server.listen(process.env.PORT || 3000);
```

## 환경변수 (.env)

```env
# mTLS 인증서 (앱인토스 콘솔에서 발급, 유효기간 390일)
CERT_PATH=./certs/client.crt
CERT_KEY_PATH=./certs/client.key
TOSS_CA_PATH=./certs/toss-ca.crt

# 토스 앱 정보
TOSS_APP_ID=nasolFans
TOSS_CLIENT_SECRET=...

# Supabase
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...  # Admin 권한 (절대 프론트에 노출 금지)

# 서버
PORT=3000
```

## 토스 로그인 OAuth 플로우

```typescript
// src/toss/auth.ts
import { createSupabaseAdmin } from '../supabase/admin';

// Step 1: 프론트에서 인가코드 수신
app.post('/auth/toss/callback', async (req, res) => {
  const { code, state } = req.body;

  // Step 2: 토스 서버에 토큰 교환 (mTLS 적용)
  const tokenResponse = await fetch('https://api.toss.im/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TOSS_APP_ID!,
      client_secret: process.env.TOSS_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.TOSS_REDIRECT_URI!,
    }),
    // mTLS: node-fetch 또는 axios에 agent 적용 필요
  });

  // Step 3: 유저 정보 조회
  const userInfo = await fetchTossUserInfo(accessToken);

  // Step 4: Supabase Auth에 유저 생성/로그인
  const supabaseAdmin = createSupabaseAdmin();
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email: `${userInfo.tossUserKey}@nasolfans.app`,
    user_metadata: { toss_user_key: userInfo.tossUserKey, nickname: userInfo.nickname },
  });

  // Step 5: users 테이블 upsert
  await supabaseAdmin.from('users').upsert({
    id: authUser.user.id,
    nickname: userInfo.nickname,
    toss_user_key: userInfo.tossUserKey,
  });

  // Step 6: 세션 토큰 발급 → 앱에 반환
  res.json({ session: ... });
});

// 연결 끊기 콜백 (필수 구현)
app.post('/auth/toss/disconnect', async (req, res) => {
  const { tossUserKey } = req.body;
  // 정책에 따라 유저 데이터 처리 (삭제 또는 비활성화)
  res.json({ ok: true });
});
```

## 토스 푸시 알림 발송

```typescript
// src/toss/push.ts
interface PushPayload {
  tossUserKey: string;
  templateSetCode: string;
  context: Record<string, string>;
}

async function sendTossPush(payload: PushPayload) {
  const response = await fetch('https://api.toss.im/v1/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Toss-User-Key': payload.tossUserKey,
    },
    body: JSON.stringify({
      templateSetCode: payload.templateSetCode,
      context: payload.context,
    }),
    // mTLS agent 적용
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }
}

// 사용 예시
await sendTossPush({
  tossUserKey: user.toss_user_key,
  templateSetCode: 'BROADCAST_REMINDER',
  context: { episode: '21회', time: '30분' },
});
```

## Supabase Admin 클라이언트

```typescript
// src/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서비스 롤 키: RLS 우회 가능
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 프론트 코드에 노출되지 않는가
- [ ] mTLS 인증서 파일이 `certs/` 디렉토리에만 있고 git에 포함되지 않는가
- [ ] 인가코드 1회 사용 처리가 구현되었는가
- [ ] 연결 끊기 콜백 엔드포인트가 구현되었는가

## 참고 문서

- 앱인토스 참조 문서: `.claude/apps-in-toss-reference.md`
- 출시 체크리스트: `.claude/apps-in-toss-checklist.md`
