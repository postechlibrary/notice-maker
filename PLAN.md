# POSTECH 도서관 공지사항 편집기 기획안

> POSTECH 박태준학술정보관 공지사항 스타일 불일치 해소를 위한 가이드라인 기반 편집기

---

## 문제 정의

홈페이지 공지사항 작성 시 담당자마다 스타일이 달라 일관성이 없습니다.

| 항목 | 발견된 문제 | 예시 |
|---|---|---|
| 연도 표기 | `2026-1` vs `2026년도` 혼재 | 학기/연도 표기 불일치 |
| 제목 접미사 | `안내` vs `공지` 혼용 | 의미 구분 없이 혼용 |
| 번호 체계 | `-`, `*`, `○` 혼재 | 담당자별 다른 기호 |
| 인삿말 | 유무 및 형식 불일치 | 일부만 도입부 인삿말 포함 |
| 영문 병기 | 제목/본문 영문 병기 기준 없음 | 일부만 부분적 영문 병기 |
| 문의처 | 위치·형식·폰트 불일치 | 하단 고정 규칙 미준수 |

---

## 해결 방향

**가이드라인 기반 공지사항 편집기** — 순수 HTML/CSS/JS로 개발, Pake로 경량 데스크톱 앱(~5MB) 패키징.

- 10개 스타일 규칙을 코드로 구현 → 실시간 위반 감지
- 자동수정 버튼 → 한 클릭으로 올바른 형식 변환
- 준수율 100% 달성 시에만 WordPress HTML 복사 허용
- Electron 대비 1/20 크기의 경량 데스크톱 앱

---

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 앱 개발 | HTML / CSS / JavaScript | 빌드 도구 불필요, 즉시 실행 |
| 리치 텍스트 에디터 | Quill.js | 경량, WordPress 호환 HTML 출력 |
| 데스크톱 패키징 | Pake CLI (Tauri 기반) | ~5MB, 작업표시줄 고정 가능 |
| 로컬 개발 | npx serve | VS Code Live Server 또는 터미널 |
| 번역 API | Papago → DeepL → LibreTranslate | 영문 제목 자동 제안 (선택 기능) |
| 단위 테스트 | Vitest | rules.js 10개 규칙 check/fix 단위 테스트 |
| 한국어 폰트 | **Pretendard** (로컬 번들) | Noto Sans KR보다 모던, 가변 폰트, 오프라인 안전 |
| UI 아이콘 | **Lucide Icons** (ES Module) | 경량, tree-shakable, SVG 직접 import 가능 |

**제약 사항**
- 핵심 기능은 오프라인 동작 필수 → CDN 라이브러리는 `./assets/vendor/`에 로컬 복사
- AI 번역은 선택적 온라인 기능 (API 키 없을 때 graceful fallback)
- Pake 빌드 환경: Rust >= 1.85, Node >= 22
- WordPress 호환 HTML 출력 (인라인 스타일, `<script>` 금지)

**아키텍처 결정 (2026-03-24 /plan-ceo-review)**
- **모듈 통신**: 이벤트 버스 패턴 (CustomEvent). app.js는 각 모듈의 init()을 호출하고 이벤트만 중계. 직접 함수 호출 최소화.
- **준수율 임계값**: COPY_THRESHOLD = 1.0 (100%) 고정. Admin Panel에서 변경 불가.
- **자동수정 debounce**: rules.check() 는 키입력 후 500ms debounce 처리 (trailing: true, leading: false).
- **Clipboard 폴백**: Clipboard API 실패 시 `<textarea>` 모달로 HTML 표시.
- **규칙 6번 spike**: 착수 초반 2일 내 Quill Delta 파싱 검증 필수. 실패 시 자동수정 제외, 감지만.
- **localStorage smoke test**: Pake 빌드 후 즉시 localStorage 생존 확인. 실패 시 Tauri fs API 파일 저장으로 전환.

**아키텍처 결정 (2026-03-24 /plan-eng-review)**
- **JS 모듈 시스템**: ES Modules (`<script type="module">`). index.html에 app.js 1개만 로드, 나머지는 import로 연결. 전역 오염 없음, 로드 순서 버그 방지, Vitest 단위 테스트 가능.
- **rules.check() 인터페이스**: `check(data)` / `fix(data)` 모두 아래 통일 data 객체 수신.
  ```js
  const data = {
    titleKo: string,    // 한국어 제목
    titleEn: string,    // 영문 제목
    category: string,   // 카테고리 (일반/긴급 공지/정기 행사/서비스 변경)
    department: string, // 부서명
    bodyHtml: string,   // Quill 콘텐츠 HTML (규칙 1,2,3,4,5,7,8,9,10)
    bodyDelta: object,  // Quill Delta (규칙 6번 전용)
  };
  ```
- **fix() 순수 함수**: 항상 새 data 반환 (`{ ...data, titleKo: fixed }`). 원본 data 변경 금지.
- **Quill setContents 커서 복원**: fix 적용 전후 `quill.getSelection()` 저장 후 `quill.setSelection()` 복원.
- **Admin 규칙 토글 의미**: 규칙 OFF = 자동 통과(passed=true). 점수는 항상 10/10 기준 유지, COPY_THRESHOLD 1.0 의미 불변.
- **규칙 오류 격리**: 각 규칙 check()/fix()는 try/catch로 감싸고, 오류 시 해당 규칙만 "ERROR" 상태로 표시. 전체 크래시 방지.
- **배치 감사 상한**: 공지 최대 50개. 초과 시 경고 표시, 상위 50개만 처리.
- **테스트 인프라**: Vitest 단위 테스트 추가. `tests/rules.test.js`에 10개 규칙 각각의 check/fix 케이스 커버.
- **templates.js 형식**: 카테고리별 HTML 템플릿을 JS 문자열 상수로 인라인 관리. fetch 불필요 (오프라인 안전).
- **Quill 툴바 구성**: `[bold, italic, underline] | [header 2/3] | [list bullet, list ordered] | [link, image] | [hr(custom blot)]`. 제외: `table`(WordPress 호환 미검증), `color`/`background`(인라인 스타일 충돌).
- **폰트/아이콘**: Pretendard(로컬 번들, `assets/vendor/fonts/`). Lucide Icons(ES Module import). CDN 의존 제거로 완전 오프라인 보장.
- **다크 모드**: CSS `prefers-color-scheme: dark` 지원. Pake/Tauri 앱이므로 OS 테마 자동 추적.

---

## 프로젝트 구조

```
notice_maker/
├── index.html                  # 메인 페이지 (2분할 레이아웃)
├── css/
│   └── style.css               # POSTECH 버건디(#bb0b52) 디자인 시스템
├── js/
│   ├── app.js                  # 상태 관리 & 이벤트 브릿지
│   ├── editor.js               # Quill 초기화, text-change 연동
│   ├── rules.js                # 10개 검증 규칙 { check(), fix() }
│   ├── templates.js            # 카테고리별 본문 템플릿
│   ├── preview.js              # WordPress 스타일 미리보기
│   ├── htmlOutput.js           # WordPress 호환 HTML 생성 & 복사
│   ├── storage.js              # 자동저장 & 템플릿 라이브러리
│   ├── diff.js                 # 자동수정 전/후 Diff 표시
│   ├── admin.js                # 규칙 관리 UI (Admin Panel)
│   ├── stats.js                # 위반 통계 수집 & 표시
│   ├── slack.js                # Slack 요약본 생성
│   └── translator.js           # AI 영문 제목 제안 (선택)
├── assets/
│   ├── vendor/                 # 로컬 복사 라이브러리 (Quill.js 등)
│   └── icon.png                # Pake 앱 아이콘
├── tests/
│   └── rules.test.js           # Vitest 단위 테스트 (10개 규칙 check/fix)
└── package.json                # Pake 빌드 스크립트 + Vitest 설정
```

---

## 화면 레이아웃

```
┌─────────────────────┬─────────────────────────────────────────┐
│  좌측: 편집 패널     │  우측: 검토 패널 (탭 전환)               │
│  ─────────────────  │  [가이드라인] [자동수정] [미리보기]       │
│  카테고리 선택       │  [HTML출력] [Slack요약] [통계] [설정]    │
│  제목 (한국어)       │                                         │
│  제목 (영문)         │  ────────────────────────────────────── │
│  날짜 · 부서         │  탭별 콘텐츠 렌더링 영역                 │
│  Quill 에디터        │                                         │
│  ─────────────────  │                                         │
│  [준수율 배너 고정]  │                                         │
│  10개 중 8개 통과    │                                         │
│  ████████░░ 80%     │                                         │
└─────────────────────┴─────────────────────────────────────────┘
```

- **준수율 배너**: 좌측 하단 고정. 100% 달성 시 "HTML 복사" 버튼 활성화.
- **자동수정 탭**: 규칙별 위반 카드 + 카드 아래 인라인 Diff 패널.

---

## 10개 검증 규칙

| # | 규칙명 | 위반 감지 | 자동수정 | 수정 방법 |
|---|---|---|---|---|
| 1 | 연도 표기 통일 | 제목에 `2026-1` 패턴 | ✅ | `2026-1` → `2026년도 1학기` |
| 2 | 접미사 통일 | 제목이 `안내`/`공지`로 안 끝남 | ✅ | `공지` → `안내` (긴급 아닐 때만) |
| 3 | 영문 제목 필수 | 영문 제목란 비어있음 | ❌ | 직접 입력 필요 |
| 4 | 괄호 사용 규칙 | 약어 외 용도 괄호 감지 | ❌ | 의미 판단 필요 |
| 5 | 도입부 표준 | 첫 줄이 인삿말 아님 | ✅ | 표준 인삿말 자동 삽입 |
| 6 | 번호 체계 통일 | `*`, `○`, `·` 등 비표준 기호 | ✅ | Quill Delta 파싱 기반 변환 |
| 7 | 일시·기간 표기 | `YYYY.MM.DD(요일) HH:MM` 아님 | ✅ | 인식 가능 형식 → 표준 변환 |
| 8 | 문의처 형식 고정 | 마지막에 문의처 블록 없음 | ✅ | 문의처 템플릿 자동 삽입 |
| 9 | 영문 병기 | 알려진 서비스명 한글만 표기 | ❌ | 목록 기반, 직접 수정 필요 |
| 10 | 이미지 alt 텍스트 | `<img>` alt 없거나 빈 것 | ❌ | 내용 작성 필요 |

**자동수정 가능 규칙**: 1, 2, 5, 6, 7, 8번 (6개)
**준수율 임계값**: `COPY_THRESHOLD = 1.0` (100%) — 피드백 후 조정 가능

---

## WordPress 호환 HTML 출력 형식

```html
<div class="library-notice">
  <p style="font-family: 'Noto Sans KR', sans-serif; font-size: 16px; line-height: 1.8;">
    안녕하세요, 박태준학술정보관입니다.
  </p>
  <h3 style="font-size: 18px; font-weight: 700;">1. 항목명</h3>
  <ul style="list-style: none; padding-left: 1em;">
    <li>가. 세부사항</li>
    <li>나. 세부사항</li>
  </ul>
  <hr style="border: 1px solid #ddd; margin: 20px 0;">
  <p style="font-size: 14px; color: #555;">
    문의: 학술서비스팀 (054-000-0000, library@postech.ac.kr)
  </p>
</div>
```

- 모든 스타일은 인라인 처리
- 금지 태그: `<script>`, `<style>`, `<iframe>`

---

## 기능 목록 (전체)

### 핵심 기능 (1단계 MVP)
- [ ] 카테고리 선택 (정기 행사 / 긴급 공지 / 서비스 변경 / 일반)
- [ ] 제목 입력 (한국어 + 영문)
- [ ] 날짜·부서 입력 필드
- [ ] Quill.js 리치 텍스트 에디터
- [ ] 카테고리별 본문 템플릿 자동 삽입
- [ ] 10개 규칙 실시간 검증 (check 함수)
- [ ] 준수율 점수 배너 (████████░░ 80%)
- [ ] WordPress 미리보기 탭
- [ ] WordPress 호환 HTML 출력 & 클립보드 복사

### UX 강화 (2단계)
- [ ] 규칙별 자동수정 버튼 (fix 함수)
- [ ] 자동수정 인라인 Diff 표시 (초록/빨강)
- [ ] 준수율 100% 달성 시 복사 버튼 활성화

### 저장·이력 (3단계)
- [ ] 5분 자동 임시저장 (localStorage, 최신 1개 유지)
- [ ] 앱 재시작 시 작업 복구 프롬프트
- [ ] 공지사항 템플릿 저장 (이름 붙여 저장)
- [ ] 템플릿 JSON export/import
- [ ] **[신규]** 팀 공유 템플릿 로드 (파일 선택 다이얼로그로 JSON 불러오기, 읽기 전용)
- [ ] **[신규]** 공지 버전 히스토리 (명시적 저장 시 스냅샷, 최대 5개)

### 확장 기능 (4단계)
- [ ] 규칙 관리 Admin Panel (규칙별 on/off 토글 — COPY_THRESHOLD 변경 불가)
- [ ] Slack 요약본 자동 생성 (제목 + 날짜 + 문의처 3줄)
- [ ] 개인 위반 통계 대시보드 (현재 세션 + localStorage 이력 기반)
- [ ] QR코드 생성 *(수요 확인 후)*
- [ ] **[신규]** 배치 준수율 감사 탭 (공지 HTML `---` 구분자로 입력 → 규칙별 열 표 + CSV 내보내기)

### AI 기능 (5단계, 선택)
- [ ] 영문 제목 자동 제안 (Papago → DeepL → LibreTranslate)
- [ ] API 키 Admin Panel에서 설정

---

## 구현 우선순위 & 일정

| 단계 | 내용 | 핵심 파일 |
|---|---|---|
| **1단계** Core MVP | 편집 → 검증 → 복사 전체 플로우 | index.html, style.css, app.js, editor.js, rules.js(check), templates.js, preview.js, htmlOutput.js |
| **2단계** UX | 자동수정 + Diff | rules.js(fix 추가), diff.js |
| **3단계** 저장 | 자동저장 + 템플릿 라이브러리 | storage.js |
| **4단계** 확장 | Admin + 통계 + Slack | admin.js, stats.js, slack.js |
| **5단계** AI | 영문 제목 제안 | translator.js |

---

## 개발 명령어

```powershell
# 로컬 개발 서버
cd c:\vibe\notice_maker
npx serve .

# Pake 데스크톱 빌드 (디버그)
pake ./index.html --name NoticeMaker --use-local-file --width 1400 --height 900 --debug

# Pake 배포 빌드 (MSI)
pake ./index.html --name NoticeMaker --use-local-file --width 1400 --height 900 --targets msi
```

---

## 착수 전 필수 검증 항목

> 1단계 코딩 시작 전에 반드시 확인해야 하는 항목들

- [ ] **Quill.js → WordPress 호환 테스트**: `getHTML()` 결과를 WordPress Classic Editor에 붙여넣기 후 저장 → 스타일 유지 여부 확인. 실패 시 TipTap으로 교체.
- [ ] **Tauri localStorage 생존 테스트**: Pake 앱 설치 → localStorage에 데이터 저장 → 앱 업데이트 → 데이터 생존 여부 확인. 실패 시 JSON 파일 기반 저장으로 전환.
- [ ] **규칙 10개 내부 스타일 가이드 대조**: 도서관 내부에 기존 스타일 가이드 문서가 있다면 현재 10개 규칙과 대조·수정.
- [ ] **규칙 6번 Quill Delta spike**: 번호 체계 자동수정은 Quill Delta `list` 블롯 레벨 파싱이 필요. 착수 전 1일 spike 권장 (단순 regex 불가).

---

## 성공 기준

- [ ] 공지사항 작성 → 10개 규칙 검증 → HTML 복사 전체 플로우 동작
- [ ] 자동수정 버튼이 6개 가능 규칙(1, 2, 5, 6, 7, 8번)에 모두 작동
- [ ] 임시저장: 창 닫고 재시작 후 작업 복구 가능
- [ ] Pake 빌드 후 ~5MB MSI 패키지 생성
- [ ] WordPress 붙여넣기 후 스타일 깨짐 없음
- [ ] 규칙 관리 UI에서 규칙 토글 및 파라미터 수정 후 즉시 반영

---

## 미결 사항 (Open Questions)

1. **Papago API 키**: Admin Panel에서 사용자가 직접 입력 → localStorage 저장 (코드에 미포함)
2. **Quill.js vs TipTap**: WordPress 호환 테스트 결과에 따라 MVP 착수 전 결정
3. **위반 통계 팀 공유**: 개인 통계 이상이 필요하면 Google Sheets 또는 공용 JSON export 방식 확정 후 구현
4. **Papago API 현황**: 2024년 이후 무료 티어 축소 → DeepL Free(월 50만자) 또는 LibreTranslate로 대체 가능
5. **Tauri localStorage 용량**: 50개 초과 시 오래된 항목 자동 삭제 또는 IndexedDB 전환 검토
