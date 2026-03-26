/**
 * editor.js — Quill 에디터 초기화 및 관리
 *
 * 툴바: bold, italic, underline | header 2/3 | list bullet/ordered | link, image | hr(custom)
 * 제외: table(WordPress 호환 미검증), color/background(인라인 스타일 충돌)
 *
 * 이벤트:
 *   editor:change → { bodyHtml, bodyDelta } (debounce 500ms, trailing)
 */

let quill = null;
let debounceTimer = null;
const DEBOUNCE_MS = 500;

// ──────────────────────────────────────────────
// Quill 툴바 설정
// ──────────────────────────────────────────────

const TOOLBAR_OPTIONS = '#custom-toolbar';

// ──────────────────────────────────────────────
// HR custom blot 등록
// ──────────────────────────────────────────────

function registerHrBlot() {
  if (!window.Quill) return;
  const BlockEmbed = Quill.import('blots/block/embed');

  class HrBlot extends BlockEmbed {
    static create() {
      const node = super.create();
      node.setAttribute('style', 'border:1px solid #ddd;margin:20px 0');
      return node;
    }
  }
  HrBlot.blotName = 'hr';
  HrBlot.tagName = 'hr';

  Quill.register(HrBlot);
}

// ──────────────────────────────────────────────
// 에디터 초기화
// ──────────────────────────────────────────────

/**
 * Quill 에디터 초기화
 * @param {string} selector - 에디터 컨테이너 CSS 선택자
 * @returns {Quill} quill 인스턴스
 */
export function init(selector = '#quill-editor') {
  if (!window.Quill) {
    console.error('[editor] Quill이 로드되지 않았습니다. assets/vendor/quill.js 확인 필요.');
    return null;
  }

  registerHrBlot();

  // HR 툴바 핸들러
  const hrHandler = function () {
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'hr', true, 'user');
    quill.setSelection(range.index + 1, 'silent');
  };

  // 기본 SVG 아이콘을 텍스트로 덮어씌워 커스텀 툴바(B/H2/목록) 유지
  const icons = Quill.import('ui/icons');
  if (icons) {
    icons.bold = 'B';
    icons.italic = 'I';
    icons.underline = 'U';
    if (!icons.header) icons.header = {};
    icons.header['2'] = 'H2';
    icons.header['3'] = 'H3';
    if (!icons.list) icons.list = {};
    icons.list['bullet'] = '☰ 목록';
    icons.link = '🔗 링크';
    icons.image = '🖼 이미지';
    icons.hr = '구분선';
  }

  quill = new Quill(selector, {
    theme: 'snow',
    placeholder: '공지사항 본문을 입력하세요...',
    modules: {
      toolbar: {
        container: TOOLBAR_OPTIONS,
        handlers: { hr: hrHandler },
      },
      clipboard: {
        // Quill 2.0부터 matchVisual 옵션은 지원되지 않음
      },
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true,
      },
    },
  });

  // text-change → debounce → CustomEvent 발행
  quill.on('text-change', (_delta, _old, source) => {
    if (source !== 'user') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const bodyHtml  = quill.getSemanticHTML();
      const bodyDelta = quill.getContents();
      document.dispatchEvent(
        new CustomEvent('editor:change', { detail: { bodyHtml, bodyDelta } })
      );
    }, DEBOUNCE_MS);
  });

  return quill;
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/** 현재 에디터 HTML 반환 */
export function getHtml() {
  return quill ? quill.getSemanticHTML() : '';
}

/** 현재 에디터 Delta 반환 */
export function getDelta() {
  return quill ? quill.getContents() : { ops: [] };
}

/** 에디터에 HTML 설정 (커서 위치 복원) */
export function setHtml(html) {
  if (!quill) return;
  const sel = quill.getSelection();
  quill.clipboard.dangerouslyPasteHTML(html);
  if (sel) quill.setSelection(sel.index, sel.length, 'silent');
}

/** 에디터에 Delta 설정 (커서 위치 복원) */
export function setDelta(delta) {
  if (!quill) return;
  const sel = quill.getSelection();
  quill.setContents(delta, 'api');
  if (sel) quill.setSelection(sel.index, sel.length, 'silent');
}

/** 에디터 비어있는지 여부 */
export function isEmpty() {
  if (!quill) return true;
  return quill.getText().trim().length === 0;
}

/** 에디터 포커스 */
export function focus() {
  quill?.focus();
}

export { quill };
