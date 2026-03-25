# Design System — POSTECH Notice Maker

> 도서관 직원용 공지사항 작성기 · 2025

---

## Product Context

- **What this is:** 대학교(POSTECH) 도서관 직원이 WordPress 공지사항을 작성·검토·게시하는 웹 편집기
- **Who it's for:** 비개발자 도서관 직원 (디지털 가이드라인 준수를 자동으로 확인받고 싶은 사용자)
- **Space/industry:** 학술 기관 내부 운영 도구 (Internal Institutional Tool)
- **Project type:** 분할 패널(Split-panel) 웹 앱 — 좌: 입력, 우: 실시간 가이드라인 결과

---

## Aesthetic Direction

- **Direction:** Industrial / Utilitarian — 기능 우선, 장식 최소화. 직원이 매일 열어도 피로하지 않을 인터페이스.
- **Decoration level:** Minimal — 타이포그래피와 색상 대비가 모든 계층을 표현함. 그라디언트·그림자는 꼭 필요한 곳만.
- **Mood:** 신뢰감 있고 조용하다. 공공기관 도구답게 무겁지 않으면서도 권위 있는 느낌. POSTECH 버건디가 앵커.
- **SAFE choices (카테고리 기준선):**
  - 좌우 분할 패널 — 문서 편집 도구의 업계 표준 (Google Docs, Notion 등에서 이미 학습된 패턴)
  - 상단 네비게이션 바 + 컨텐츠 영역 — 기관 도구의 가장 보편적 레이아웃
  - 규칙 패스/실패를 초록/빨강으로 표시 — 시각적 언어가 이미 보편화됨
- **RISKS (차별화 지점):**
  - 브랜드 버건디(#bb0b52)를 단순 헤더 배경이 아닌 준수율 바 · 액티브 탭 · 포커스 링 전반에 사용 — 대부분의 내부 도구는 회사 색을 헤더에만 가둔다
  - 스텝 번호(① ②)를 인터페이스 라벨로 사용 — 복잡한 설명서 없이 사용 순서를 가이드

---

## Typography

- **Display / UI 전반:** `Pretendard Variable` — 한국어 화면에서 Noto Sans KR보다 훨씬 가독성이 높고, 굵기 range가 넓어 한 폰트로 모든 계층을 표현함
- **Body:** `Pretendard Variable` — UI와 동일 폰트. weight 400 사용
- **UI Labels / Buttons:** `Instrument Sans` — 라틴 알파벳 레이블(DeepL, Score 등)에만 보조 사용. Pretendard와 잘 어울림
- **Code / HTML Output:** `JetBrains Mono` — HTML 미리보기·복사 패널에서 코드 가독성 확보
- **Loading strategy:** `font-display: swap` · 로컬 woff2 파일 우선 (`/css/fonts/`), 없으면 Google Fonts CDN fallback
- **Type scale:**

| Token        | Size | Weight | Usage                        |
|--------------|------|--------|------------------------------|
| `--text-2xs` | 10px | 600    | 레이블, uppercase 배지       |
| `--text-xs`  | 11px | 400    | 보조 설명, 힌트               |
| `--text-sm`  | 12px | 400    | 폼 입력값, 규칙 설명          |
| `--text-base`| 13px | 400    | 본문, 에디터 기본 텍스트      |
| `--text-md`  | 14px | 600    | 섹션 소제목 (H3 in editor)   |
| `--text-lg`  | 16px | 600    | 패널 제목                    |
| `--text-xl`  | 18px | 700    | 페이지 타이틀                |

---

## Color

- **Approach:** Restrained — 1개 브랜드 컬러 + 1개 액센트 + 시맨틱 4색 + 뉴트럴 그레이 스케일

### Brand
| Token           | Hex       | Usage                                         |
|-----------------|-----------|-----------------------------------------------|
| `--brand`       | `#bb0b52` | 상단 바, 준수율 바, 액티브 탭 밑줄, 포커스 링, 주요 CTA |
| `--brand-dark`  | `#8c0840` | hover 상태                                    |
| `--brand-light` | `#f5e6ed` | 배지 배경, 강조 영역 배경                     |
| `--brand-muted` | `#d94f82` | 그라디언트 끝색 (준수율 바 우측)              |

### Accent
| Token           | Hex       | Usage                          |
|-----------------|-----------|--------------------------------|
| `--accent`      | `#1a56a0` | DeepL 버튼, 정보성 링크        |
| `--accent-light`| `#e8f0fa` | 정보(Info) 알림 배경           |

### Semantic
| Token        | Hex       | Usage              |
|--------------|-----------|--------------------|
| `--success`  | `#1a7f4b` | 규칙 통과, 완료 상태 |
| `--warning`  | `#b45309` | 권고 위반, 경고     |
| `--error`    | `#c0392b` | 필수 규칙 위반      |
| `--info`     | `#0369a1` | 안내 메시지         |

### Neutrals (Warm Gray)
`#f9f9f9` → `#f0f0f0` → `#e4e4e4` → `#d1d1d1` → `#a0a0a0` → `#737373` → `#525252` → `#404040` → `#262626` → `#171717`

### Dark Mode Strategy
- Surface: `#1e1e1e`, Background: `#141414`
- Gray scale 반전. Brand/Accent/Semantic 채도 10% 감소.
- `data-theme="dark"` 속성으로 CSS custom properties 오버라이드

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable (기관 도구이므로 너무 빽빽하지 않게)

| Token    | Value | Usage                            |
|----------|-------|----------------------------------|
| `--sp1`  | 4px   | 아이콘–텍스트 간격, 인라인 갭    |
| `--sp2`  | 8px   | 입력 내부 패딩, 배지 패딩        |
| `--sp3`  | 12px  | 카드 내부 패딩 (소)              |
| `--sp4`  | 16px  | 폼 그룹 간격, 카드 내부 패딩 (기본) |
| `--sp5`  | 20px  | 패널 좌우 패딩                   |
| `--sp6`  | 24px  | 섹션 간격                       |
| `--sp8`  | 32px  | 주요 섹션 마진                  |
| `--sp10` | 40px  | 페이지 레벨 여백                |

---

## Layout

- **Approach:** Grid-disciplined (엄격한 2-패널 분할)
- **Split panel:**
  - 좌측 `.edit-panel`: `width: 420px; flex-shrink: 0` — 고정 너비
  - 우측 `.review-panel`: `flex: 1` — 나머지 공간 채움
- **최소 해상도:** 1024px (도서관 데스크톱 환경 기준)
- **Border radius scale:**

| Token         | Value | Usage                         |
|---------------|-------|-------------------------------|
| `--radius-xs` | 3px   | 버튼, 입력 필드               |
| `--radius-sm` | 5px   | 배지, 규칙 카드, 힌트 박스    |
| `--radius-md` | 8px   | 패널 내부 카드, 스탯 카드     |
| `--radius-lg` | 12px  | 모달, 드롭다운               |

---

## Motion

- **Approach:** Minimal-functional — 이해를 돕는 트랜지션만. 애니메이션은 없음.
- **Transitions:**
  - 색상/배경: `transition: .15s ease`
  - 테마 전환: `transition: background .25s, color .25s`
  - 준수율 바: `transition: width .4s ease`
  - 커서 깜빡임: `animation: blink .8s infinite` (Quill 에디터 내 커서)
- **No motion:** 페이지 진입 애니메이션 없음. 스크롤 이벤트 애니메이션 없음.

---

## Component Inventory

### 핵심 컴포넌트 (현재 구현됨)

| Component         | Description                                            |
|-------------------|--------------------------------------------------------|
| App Topbar        | 버건디 상단 바. 로고 + 주요 액션 버튼                  |
| Edit Panel        | 좌측 입력 패널. 고정 420px 너비                        |
| Step Label        | ①② 스텝 배지 + 텍스트. 사용 순서 안내                |
| Form Input        | 라벨 + 입력 필드. 포커스 시 버건디 테두리             |
| DeepL Button      | 영문 제목 입력 필드 내 인라인 버튼                     |
| Quill Editor      | snow 테마. 툴바 + 본문 영역. flex:1 로 높이 채움      |
| Compliance Bar    | 하단 고정. 준수율 트랙 + 퍼센트                       |
| Review Panel      | 우측 결과 패널. 탭 + 규칙 목록                        |
| Rule Item         | pass/fail/warn 3가지 상태. 좌측 colored border        |
| Guideline Tabs    | 가이드라인 / 자동수정 / 미리보기 / HTML / 배치 / ⚙    |
| Score Pill        | 준수율 % 배지. edit-panel header 우측                 |
| Fix Button        | 규칙 카드 우측 자동수정 버튼                           |
| Stat Cards        | 대시보드용 통계 카드. 상단 colored border             |

### 버튼 variants

| Variant       | Usage                                        |
|---------------|----------------------------------------------|
| `.btn-primary`   | 게시 미리보기 등 주요 CTA. 버건디 배경     |
| `.btn-secondary` | 임시저장 등 보조 CTA. 버건디 테두리       |
| `.btn-ghost`     | 취소 등 옵션 액션. 회색 테두리            |
| `.btn-accent`    | DeepL 번역 등 외부 서비스 연동. 파란 배경 |

---

## Editor-Specific Rules

- `#quill-editor`는 반드시 `flex: 1; min-height: 0` flex 컨테이너 안에 위치해야 함
- `.editor-section` 안에 다른 flex child를 추가하면 에디터 높이가 압축됨 — 반드시 **`.editor-header` (flex-shrink: 0)** 로 분리
- Quill `.ql-container`는 `display: flex; flex-direction: column; flex: 1`로 설정되어야 `.ql-editor`가 나머지 높이를 채움
- 에디터 최소 높이는 레이아웃이 아닌 뷰포트 계산으로 보장 (CSS flex chain만으로 충분)

---

## File Structure (Design-Related)

```
notice_maker/
├── css/
│   └── style.css          ← 모든 CSS custom properties + 컴포넌트 스타일
├── js/
│   ├── app.js             ← 앱 진입점, 이벤트 오케스트레이션
│   ├── editor.js          ← Quill 초기화 및 델타/HTML 변환
│   ├── rules.js           ← 가이드라인 규칙 엔진
│   ├── batch.js           ← 배치 감사 및 CSV 내보내기
│   ├── translate.js       ← DeepL API 연동
│   └── storage.js         ← localStorage 저장/복원
├── index.html             ← 메인 UI (분할 패널 레이아웃)
└── DESIGN.md              ← 이 파일
```

---

## Decisions Log

| Date       | Decision                              | Rationale                                                             |
|------------|---------------------------------------|-----------------------------------------------------------------------|
| 2025-03-25 | Initial design system created         | /design-consultation — 도서관 직원용 분할 패널 편집기 UI 설계        |
| 2025-03-25 | Pretendard Variable 선택              | 한국어 기관 도구에서 가독성·굵기 범위 최적. Inter 과다 사용 회피    |
| 2025-03-25 | 4px base spacing unit                 | 기존 코드베이스의 --space-* 변수와 정합. 픽셀 퍼펙션 유지           |
| 2025-03-25 | 420px fixed left panel                | 메타데이터 폼 + 에디터 레이아웃에 충분한 최소 너비. 1024px 기준 50% 미만 |
| 2025-03-25 | .editor-header flex-shrink:0 분리     | .editor-section 내부 flex child 추가 시 Quill 높이 붕괴 방지 (버그 수정에서 파생) |
| 2025-03-25 | Minimal motion                        | 기관 도구는 애니메이션이 오히려 집중을 방해함. 기능적 트랜지션만    |
