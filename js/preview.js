/**
 * preview.js — WordPress 스타일 공지사항 미리보기 렌더링
 *
 * innerHTML 렌더링 사용 (내부 도구, XSS 위험 낮음).
 * P3 TODO: DOMPurify 또는 <iframe srcdoc>로 교체 검토 (TODOS.md 참조).
 */

/**
 * 공지사항 데이터를 WordPress 스타일 HTML로 렌더링
 * @param {object} data - { titleKo, titleEn, category, department, date, bodyHtml }
 * @returns {string} 렌더링된 HTML 문자열
 */
export function render(data) {
  const { titleKo, titleEn, category, department, date } = data;
  const bodyHtml = data.bodyHtml || '';

  if (!titleKo && !bodyHtml.trim()) {
    return '<p style="color:#888;text-align:center;padding:40px 0">내용을 입력하면 미리보기가 표시됩니다.</p>';
  }

  const categoryLabel = {
    general:  '일반 안내',
    event:    '정기 행사',
    service:  '서비스 변경',
    urgent:   '긴급 공지',
  }[category] ?? category;

  const formattedDate = date ? formatDate(date) : '';

  return `
    <div style="font-family:'Noto Sans KR',sans-serif;max-width:720px;margin:0 auto;color:#222;line-height:1.8;">
      <!-- 메타 헤더 -->
      <div style="border-bottom:2px solid #bb0b52;padding-bottom:16px;margin-bottom:24px;">
        ${categoryLabel
          ? `<span style="display:inline-block;background:#bb0b52;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:3px;margin-bottom:8px;">${categoryLabel}</span>`
          : ''}
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;line-height:1.3;">
          ${escHtml(titleKo)}
        </h1>
        ${titleEn
          ? `<p style="font-size:14px;color:#666;margin:0;">${escHtml(titleEn)}</p>`
          : ''}
        <div style="font-size:13px;color:#888;margin-top:8px;">
          ${formattedDate ? `<span>${formattedDate}</span>` : ''}
          ${department ? `<span style="margin-left:12px;">담당: ${escHtml(department)}</span>` : ''}
        </div>
      </div>

      <!-- 본문 -->
      <div style="font-size:15px;line-height:1.85;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────

function escHtml(str) {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (isNaN(d)) return isoDate;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dow = days[d.getDay()];
  return `${y}.${m}.${day}(${dow})`;
}
