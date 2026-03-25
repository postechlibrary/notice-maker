/**
 * diff.js — 자동수정 전/후 Diff 시각화
 *
 * generateDiff(before, after, isHtml?)
 *   → <del class="diff-del">...</del> / <ins class="diff-ins">...</ins> HTML
 *
 * 알고리즘: LCS(최장 공통 부분 수열) 기반 word-level diff
 * 입력이 HTML인 경우 plain text로 변환 후 비교
 */

// ──────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function htmlToText(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 단어 + 공백 단위 토크나이저 (공백도 토큰으로 보존) */
function tokenize(text) {
  return text.match(/\S+|\s+/g) ?? [];
}

// ──────────────────────────────────────────────
// LCS 기반 diff
// ──────────────────────────────────────────────

/**
 * @param {string[]} a - before 토큰
 * @param {string[]} b - after 토큰
 * @returns {{ type: 'equal'|'delete'|'insert', text: string }[]}
 */
function computeDiff(a, b) {
  const m = a.length;
  const n = b.length;

  // 큰 텍스트 방어: 토큰 합계 500 초과 시 단순 replace 처리
  if (m + n > 500) {
    const ops = [];
    if (m > 0) ops.push({ type: 'delete', text: a.join('') });
    if (n > 0) ops.push({ type: 'insert', text: b.join('') });
    return ops;
  }

  // DP 테이블 (Int32Array로 메모리 최적화)
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // 역추적
  const ops = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', text: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert', text: b[j - 1] });
      j--;
    } else {
      ops.unshift({ type: 'delete', text: a[i - 1] });
      i--;
    }
  }

  return ops;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * 두 문자열의 word-level diff를 HTML로 반환
 *
 * @param {string} before  - 수정 전 문자열 (HTML 또는 plain text)
 * @param {string} after   - 수정 후 문자열 (HTML 또는 plain text)
 * @param {boolean} [isHtml=true] - true면 HTML strip 후 텍스트 비교
 * @returns {string} diff 결과 HTML
 */
export function generateDiff(before, after, isHtml = true) {
  if (before === after) {
    return '<span class="diff-equal">변경 없음</span>';
  }

  const bText = isHtml ? htmlToText(before) : (before ?? '');
  const aText = isHtml ? htmlToText(after)  : (after  ?? '');

  if (!bText && !aText) {
    return '<span class="diff-equal">변경 없음</span>';
  }

  const ops = computeDiff(tokenize(bText), tokenize(aText));

  // 연속 같은 타입 병합 (렌더링 최적화)
  const merged = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      merged.push({ ...op });
    }
  }

  return merged.map(op => {
    const safe = escHtml(op.text);
    if (op.type === 'equal')  return safe;
    if (op.type === 'delete') return `<del class="diff-del">${safe}</del>`;
    if (op.type === 'insert') return `<ins class="diff-ins">${safe}</ins>`;
    return '';
  }).join('');
}
