/**
 * htmlOutput.js — WordPress 호환 HTML 생성 & 클립보드 복사
 *
 * - 모든 스타일 인라인 처리
 * - 금지 태그 제거: <script>, <style>, <iframe>
 * - Clipboard API 실패 시 <textarea> 폴백 콜백 호출
 */

// WordPress 호환 래퍼 스타일
const WRAPPER_STYLE = [
  'font-family: \'Noto Sans KR\', \'Apple SD Gothic Neo\', sans-serif',
  'font-size: 15px',
  'line-height: 1.85',
  'color: #222222',
  'max-width: 720px',
].join('; ');

const HR_STYLE = 'border: 1px solid #dddddd; margin: 20px 0';

/**
 * WordPress 호환 HTML 생성
 * @param {object} data - { titleKo, titleEn, category, department, date, bodyHtml }
 * @returns {string} 완성된 HTML 문자열
 */
export function generate(data) {
  const body = sanitizeBody(data.bodyHtml || '');

  const html = `<div class="library-notice" style="${WRAPPER_STYLE}">\n${body}\n</div>`;
  return html;
}

// ──────────────────────────────────────────────
// HTML 정제
// ──────────────────────────────────────────────

/**
 * Quill HTML을 WordPress 호환 HTML로 변환
 * - 금지 태그 제거
 * - 태그에 인라인 스타일 적용
 * - 빈 <p> 정리
 */
function sanitizeBody(html) {
  // 금지 태그 제거
  let clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // class, data-* 속성 제거 (인라인 스타일만 유지)
  clean = clean.replace(/\s(?:class|data-[a-z-]+)="[^"]*"/g, '');

  // 태그별 인라인 스타일 적용
  clean = applyInlineStyles(clean);

  // 연속 빈 <p> 정리
  clean = clean.replace(/(<p[^>]*>\s*<\/p>\s*){2,}/g, '<p></p>');

  return clean.trim();
}

function applyInlineStyles(html) {
  return html
    // <p>
    .replace(/<p(?![^>]*style=)>/gi, '<p style="margin: 0 0 10px">')
    // <strong>
    .replace(/<strong(?![^>]*style=)>/gi, '<strong style="font-weight: 700">')
    // <em>
    .replace(/<em(?![^>]*style=)>/gi, '<em style="font-style: italic">')
    // <u>
    .replace(/<u(?![^>]*style=)>/gi, '<u style="text-decoration: underline">')
    // <h2>
    .replace(/<h2(?![^>]*style=)>/gi, '<h2 style="font-size: 18px; font-weight: 700; margin: 20px 0 8px">')
    // <h3>
    .replace(/<h3(?![^>]*style=)>/gi, '<h3 style="font-size: 16px; font-weight: 700; margin: 16px 0 6px">')
    // <ul>
    .replace(/<ul(?![^>]*style=)>/gi, '<ul style="list-style: none; padding-left: 1em; margin: 0 0 10px">')
    // <ol>
    .replace(/<ol(?![^>]*style=)>/gi, '<ol style="padding-left: 1.5em; margin: 0 0 10px">')
    // <li>
    .replace(/<li(?![^>]*style=)>/gi, '<li style="margin-bottom: 4px">')
    // <a>
    .replace(/<a(?![^>]*style=)(\s[^>]*)>/gi, '<a$1 style="color: #bb0b52; text-decoration: underline">')
    // <hr>
    .replace(/<hr[^>]*>/gi, `<hr style="${HR_STYLE}">`)
    // <img> — alt 보존
    .replace(/<img([^>]*?)>/gi, (_, attrs) => `<img${attrs} style="max-width: 100%; height: auto">`);
}

// ──────────────────────────────────────────────
// 클립보드 복사
// ──────────────────────────────────────────────

/**
 * HTML 클립보드 복사
 * @param {string} html - 복사할 HTML 문자열
 * @param {function} fallback - Clipboard API 실패 시 콜백(html)
 */
export async function copyToClipboard(html, fallback) {
  try {
    await navigator.clipboard.writeText(html);
    showCopyToast('HTML이 클립보드에 복사되었습니다.');
  } catch (_err) {
    // Clipboard API 거부 → <textarea> 폴백
    if (typeof fallback === 'function') {
      fallback(html);
    }
  }
}

// ──────────────────────────────────────────────
// 복사 완료 토스트
// ──────────────────────────────────────────────

function showCopyToast(message) {
  const existing = document.getElementById('copy-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'copy-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '24px',
    left:         '50%',
    transform:    'translateX(-50%)',
    background:   '#16a34a',
    color:        '#fff',
    padding:      '10px 20px',
    borderRadius: '6px',
    fontSize:     '14px',
    fontWeight:   '600',
    zIndex:       '999',
    boxShadow:    '0 4px 12px rgba(0,0,0,.15)',
    transition:   'opacity .3s ease',
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
