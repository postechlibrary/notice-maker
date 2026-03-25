# TODOS — POSTECH 도서관 공지사항 편집기

> 이 파일은 /plan-ceo-review (2026-03-24) 에서 생성되었습니다.
> /plan-eng-review (2026-03-24) 에서 P2 항목 2개 추가.
> Gemini 계획 검토 (2026-03-24) 에서 P2 항목 3개, P3 항목 2개 추가.
> 핵심 구현 계획은 PLAN.md를 참조하세요.

---

## P1 — 착수 전 필수 검증 (Spike)

### [SPIKE] Quill Delta `list` 블롯 파싱 가능 여부

**What**: 규칙 6번(번호 체계 통일) 자동수정을 위한 Quill Delta `list` 타입 파싱 spike.

**Why**: Quill Delta를 파싱하지 않으면 규칙 6번 `fix()` 함수 구현 불가. regex로는 중첩 리스트 구조를 신뢰성 있게 변환할 수 없음.

**Pros**: 성공 시 6개 자동수정 규칙 모두 완성.

**Cons**: 실패 시 규칙 6번은 감지만 가능 (자동수정 없음), 2단계 완료 기준을 "5개 자동수정"으로 조정 필요.

**Context**: Quill의 Delta format은 `ops: [{insert: '\n', attributes: {list: 'bullet'}}]` 구조. 리스트 변환은 이전 Delta 상태와 비교해야 하므로 단순 문자열 치환 불가.

**Effort**: S (human: ~1일 / CC: ~30분)

**Priority**: P1 — 1단계 착수 초반 2일 내

**Depends on**: Quill.js 설치 완료

---

### [SPIKE] Tauri localStorage 데이터 Pake 업데이트 후 생존 여부

**What**: Pake 앱 설치 → localStorage 저장 → 앱 업데이트 → 데이터 생존 확인.

**Why**: 3단계(자동저장, 버전 히스토리, 템플릿 라이브러리) 전체가 localStorage 기반. 실패 시 저장 전략 전환 필요.

**Pros**: 성공 시 3단계 구현 그대로 진행.

**Cons**: 실패 시 Tauri `fs` API 기반 파일 저장으로 전환 — 추가 구현 비용 발생.

**Context**: Tauri WebView의 localStorage는 앱 업데이트 시 일부 버전에서 초기화될 수 있음. 경로: `%APPDATA%\NoticeMaker\` 하위 파일 저장이 더 안정적일 수 있음. 실패 시 fallback: JSON 파일 저장 (저장 경로 표시 + 파일 선택 다이얼로그).

**Effort**: S (human: ~반나절 / CC: ~20분)

**Priority**: P1 — 1단계 착수 초반 2일 내

**Depends on**: Pake 빌드 환경 설치 완료

---

## P2 — UX 개선

### [UX] 카테고리 변경 시 기존 본문 대체 확인 다이얼로그

**What**: 카테고리를 변경할 때 기존 에디터 내용이 있으면 "새 템플릿으로 대체하시겠습니까?" 확인 모달 표시.

**Why**: 사용자가 본문 작성 중 카테고리를 실수로 변경하면 새 템플릿이 기존 작업을 덮어써 복구 불가.

**Pros**: 의도치 않은 작업 손실 방지.

**Cons**: 빈 에디터일 때도 다이얼로그가 뜨면 불편 → 에디터가 비어 있으면 다이얼로그 없이 즉시 교체.

**Context**: Quill `editor.getText().trim() === ''` 조건으로 빈 에디터 판별 가능. 버전 히스토리(3단계) 구현 후에는 "이전 버전으로 복구" 링크도 같이 제공.

**Effort**: XS (human: ~2시간 / CC: ~5분)

**Priority**: P2 — 1단계 MVP에 포함 권장

**Depends on**: editor.js 구현 완료

---

### [UX] Clipboard API 실패 시 `<textarea>` 폴백 모달

**What**: `navigator.clipboard.writeText()` 거부 시 HTML을 `<textarea>`에 표시하고 사용자가 수동으로 복사하도록 안내.

**Why**: Clipboard API는 일부 환경(보안 설정 강화된 PC)에서 거부될 수 있음. 거부 시 사용자가 HTML을 얻을 방법이 없어짐.

**Pros**: 어떤 환경에서도 HTML 복사 가능.

**Cons**: UX가 약간 번거로워짐 (수동 Ctrl+C 필요).

**Context**: `htmlOutput.js`의 복사 함수에 try/catch 추가. 실패 시 모달 `<textarea>` 표시. 모달은 클릭 시 전체 선택 처리.

**Effort**: XS (human: ~1시간 / CC: ~5분)

**Priority**: P2 — htmlOutput.js 구현 시 동시 처리

**Depends on**: htmlOutput.js 구현 완료

---

### [UX] Quill 붙여넣기 시 외부 서식 제거

**What**: Quill 에디터에 WordPress 또는 외부 소스에서 복사한 텍스트를 붙여넣을 때 인라인 스타일 제거.

**Why**: 외부 서식이 에디터에 남아 있으면 HTML 출력에 의도치 않은 스타일이 포함되어 WordPress 가이드라인 위반.

**Pros**: 출력 HTML 일관성 보장.

**Cons**: 서식을 의도적으로 유지하고 싶은 경우 불편할 수 있음 (내부 도구이므로 허용 범위).

**Context**: Quill `matchVisual: false` 옵션 + `clipboard` 모듈의 `matchers` 설정으로 구현. 또는 `paste` 이벤트 가로채 DOMPurify로 정리.

**Effort**: XS (human: ~2시간 / CC: ~5분)

**Priority**: P2 — editor.js 구현 시 동시 처리

**Depends on**: editor.js 구현 완료

---

### [UX] localStorage quota 초과 시 자동 정리 로직

**What**: `localStorage.setItem()` 실패(quota 초과) 시 가장 오래된 버전 스냅샷 자동 삭제 + 사용자 경고 토스트.

**Why**: setItem은 quota 초과 시 예외를 던지거나 조용히 실패함. 감지하지 않으면 버전 히스토리나 자동저장 데이터가 유실되었는지 사용자가 알 수 없음.

**Pros**: 데이터 유실 방지, 사용자가 상황을 인지 가능.

**Cons**: 삭제 전 확인 다이얼로그 추가 시 UX 복잡도 증가. 토스트 경고로 단순화 권장.

**Context**: `storage.js`에서 setItem을 try/catch로 감싸고, 실패 시 가장 오래된 버전 키 삭제 후 재시도. 실패 횟수 3회 초과 시 "저장 불가" 경고 표시. 버전 히스토리 최대 5개 제한이 있으므로 실제 발생 가능성은 낮으나, 방어 코드로 필요.

**Effort**: XS (human: ~1시간 / CC: ~5분)

**Priority**: P2 — storage.js 구현 시 동시 처리

**Depends on**: storage.js 구현 완료

---

### [UX] Quill.js → WordPress 호환성 테스트 체크리스트

**What**: Quill `getHTML()` 출력을 WordPress Classic Editor / Gutenberg에 붙여넣기 후 저장 → 스타일 유지 여부 검증 체크리스트 문서화.

**Why**: 현재 검증 계획에 "붙여넣기 후 확인"이 있으나 구체적인 테스트 케이스(볼드, 목록, 인라인 스타일, 특수문자 등)가 정의되지 않음. 나중에 TipTap 교체를 고려할 때도 동일 체크리스트 재사용 가능.

**Pros**: 회귀 방지, WordPress 호환 요구사항 명확화.

**Cons**: 수동 테스트 필요 (자동화 불가). 케이스 관리 비용.

**Context**: 체크리스트 내용 예시: 볼드/이탤릭 인라인 스타일 유지, `<ul>/<ol>` 목록 구조 보존, `<hr>` 구분선 렌더링, Noto Sans KR 폰트 패밀리 적용, `<img>` alt 텍스트 보존. Gutenberg는 블록 단위 파싱이라 Classic Editor와 동작이 다를 수 있음.

**Effort**: XS (human: ~2시간 / CC: ~5분 문서 작성)

**Priority**: P2 — 1단계 MVP 완료 직후 (Pake 빌드 전)

**Depends on**: 1단계 htmlOutput.js 구현 완료

---

### [UX] 규칙 위반 인라인 툴팁

**What**: 가이드라인 배너의 각 규칙 항목에 마우스 오버 시 위반 이유 + 올바른 예시 팝업 표시.

**Why**: 사서가 자동수정에만 의존하지 않고 규칙 취지를 이해하면 재위반율 감소. 신입 담당자 온보딩 효과도 있음.

**Pros**: 교육 효과, UX 문서화 내재화.

**Cons**: 10개 규칙 각각 툴팁 문구 작성 필요 (콘텐츠 유지보수).

**Context**: `rules.js`의 각 규칙 객체에 `tooltip: { bad: '2026-1학기', good: '2026년도 1학기' }` 필드 추가. CSS `::tooltip` 또는 커스텀 `<div class="tooltip">` 구현. 위반 상태일 때만 표시하거나 항상 표시 가능.

**Effort**: XS (human: ~2시간 / CC: ~5분)

**Priority**: P2 — rules.js 구현 시 동시 처리

**Depends on**: rules.js 구현 완료

---

### [UX] 키보드 단축키 지원

**What**: 자주 쓰는 동작에 키보드 단축키 연결.

**Why**: 하루 여러 건 공지를 작성하는 담당자에게 마우스 클릭 반복은 피로 요인. 단축키로 워크플로 속도 향상.

**Pros**: 파워 유저 생산성 향상, 접근성 개선.

**Cons**: Pake/Tauri 환경에서 OS 수준 단축키와 충돌 여부 확인 필요.

**Context**: 제안 단축키: `Ctrl+Shift+C`(HTML 복사), `Ctrl+S`(즉시 임시저장), `Ctrl+Shift+P`(미리보기 탭 전환), `Ctrl+Shift+A`(전체 자동수정). `app.js`에서 `document.addEventListener('keydown', ...)` 등록. Pake 환경에서 `Ctrl+S`가 Tauri 내장 단축키와 충돌하지 않는지 spike 필요.

**Effort**: XS (human: ~1시간 / CC: ~5분)

**Priority**: P2 — app.js 구현 시 동시 처리

**Depends on**: app.js 구현 완료

---

### [INFRA] 폰트 오프라인 번들링

**What**: Pretendard 폰트 파일을 `assets/vendor/fonts/`에 로컬 복사하여 CDN 의존 제거.

**Why**: CDN 차단 환경(대학 내부망, 보안 PC)에서 폰트가 깨져도 앱이 계속 동작해야 함. Quill.js는 이미 로컬 복사 계획이 있으므로 폰트도 동일 원칙 적용.

**Pros**: 완전 오프라인 동작 보장, 네트워크 지연 없음.

**Cons**: 번들 크기 증가 (Pretendard 가변 폰트 woff2 ~500KB). Pake 빌드 시 `--use-local-file`로 자동 포함됨.

**Context**: `npm install pretendard` 또는 공식 GitHub 릴리즈에서 `PretendardVariable.woff2` 다운로드. `style.css`에서 `@font-face { src: url('../assets/vendor/fonts/PretendardVariable.woff2') }` 등록. CDN 링크 제거.

**Effort**: XS (human: ~30분 / CC: ~2분)

**Priority**: P2 — style.css 구현 시 동시 처리 (1단계 초반)

**Depends on**: style.css 작성 착수

---

## P3 — 추후 검토

### [UX] 자주 쓰는 문구 스니펫 라이브러리

**What**: Quill 에디터에서 `@` 입력 시 자주 쓰는 표현 자동완성 팝업. 선택 시 해당 텍스트/HTML 블록 삽입.

**Why**: "안녕하세요, 박태준학술정보관입니다." 같은 반복 문구를 매번 입력하면 오타·형식 오류 발생. 스니펫으로 규칙 5번, 8번 위반 예방 효과.

**Pros**: 입력 속도 향상, 규칙 위반 예방, 신규 담당자 가이드.

**Cons**: 스니펫 목록 유지보수 필요. Quill 커스텀 모듈(`quill-mention` 또는 자체 구현) 추가 의존성.

**Context**: 스니펫 후보: `@인삿말`(도입부 인삿말), `@문의처`(문의처 블록), `@기간`(날짜 형식 뼈대 `YYYY.MM.DD(요일) HH:MM ~ YYYY.MM.DD(요일) HH:MM`), `@공지마감`(서비스 종료 문구). `templates.js`에 스니펫 상수 추가 후 `editor.js`에서 `@` 트리거 감지. 또는 우측 패널에 클릭 삽입 버튼으로 단순화 가능 (Quill 커스텀 모듈 없이).

**Effort**: S (human: ~반나절 / CC: ~15분)

**Priority**: P3 — 3단계 이후 (templates.js, editor.js 구현 완료 후)

**Depends on**: editor.js, templates.js 구현 완료

---

### [UX] 미리보기 인쇄/PDF 출력 CSS

**What**: 미리보기 탭에서 `Ctrl+P`(또는 인쇄 버튼) 시 WordPress 스타일 그대로 출력되도록 `@media print` CSS 추가.

**Why**: 오프라인 회의용 종이 출력 또는 PDF 보관 시 편집 UI 없이 공지 내용만 깔끔하게 출력.

**Pros**: 종이/PDF 출력 지원, 추가 도구 불필요.

**Cons**: Pake/Tauri WebView 환경에서 인쇄 다이얼로그 동작 미검증 → 착수 전 spike 필요. 실패 시 "HTML 복사 후 브라우저에서 출력" 안내 문구로 대체.

**Context**: `preview.js` 또는 `style.css`에 `@media print { .editor-panel, .review-panel .tabs { display: none; } .preview-content { display: block; } }` 추가. Pake 빌드에서 `window.print()` 호출 후 Tauri 네이티브 인쇄 다이얼로그 동작 여부 확인 필요.

**Effort**: XS (human: ~1시간 / CC: ~5분) — spike 포함 시 S

**Priority**: P3 — 1단계 MVP 이후

**Depends on**: preview.js 구현 완료, Pake 빌드 환경 검증

---

### [FEATURE] 기존 공지 소급 감사 임포트

**What**: WordPress 에서 기존 공지 HTML을 임포트해 10개 규칙 기준으로 소급 점검.

**Why**: 도입 전 기존 공지 100+건의 준수율 현황 파악 및 일괄 개선.

**Pros**: 도입 효과 측정, 기존 공지 개선.

**Cons**: 다양한 HTML 포맷 파싱 복잡도 높음.

**Context**: 4단계 배치 감사 기능 구현 후 입력 탭 추가 방식으로 구현 가능. 독립 기능으로 개발하지 않고 배치 감사의 확장으로 접근.

**Effort**: M (human: ~3일 / CC: ~1시간)

**Priority**: P3 — 4단계 이후

**Depends on**: 4단계 배치 준수율 감사 완료

---

### [FEATURE] 온보딩 인터랙티브 투어

**What**: 신입 사서가 처음 실행 시 10개 규칙을 단계별로 안내하는 인터랙티브 가이드.

**Why**: 인수인계 교육 시간 0으로 줄이기.

**Pros**: 자기 학습, 교육 비용 절감.

**Cons**: 콘텐츠 유지보수 필요 (규칙 변경 시 투어도 업데이트).

**Context**: Shepherd.js 또는 순수 JS 툴팁으로 구현. 1.0 릴리즈 후 UX 개선 단계로.

**Effort**: S (human: ~1일 / CC: ~20분)

**Priority**: P3 — 1.0 릴리즈 후

**Depends on**: 1단계 MVP 완료

---

### [FEATURE] 미리보기 XSS 방어 강화

**What**: `preview.js`의 innerHTML 렌더링을 `<iframe srcdoc>` 또는 DOMPurify로 교체.

**Why**: 사용자 입력이 HTML로 렌더링되므로 이론적으로 XSS 가능 (내부 도구이나 방어 습관).

**Pros**: 보안 강화.

**Cons**: `<iframe srcdoc>` 전환 시 스타일 적용 방식 변경 필요.

**Context**: 내부 도구이므로 실제 위험은 낮으나 모범 사례로 적용 권장.

**Effort**: S (human: ~반나절 / CC: ~15분)

**Priority**: P3 — 1단계 MVP 이후

**Depends on**: preview.js 구현 완료
