/**
 * batch.js — 배치 준수율 감사
 *
 * 사용법:
 *   1. WordPress "HTML 소스 보기"에서 공지 HTML을 복사
 *   2. 여러 공지는 `---` 구분자로 이어붙임
 *   3. parseNotices(text) → notice 배열
 *   4. auditBatch(notices, disabledRules) → 감사 결과 배열
 *   5. exportCsv(auditResults) → 파일 다운로드
 */

import { checkAll, rules as RULES } from './rules.js';

// ──────────────────────────────────────────────
// HTML → 공지 데이터 파싱
// ──────────────────────────────────────────────

/**
 * 구분자(---)로 분리된 여러 공지 HTML 텍스트 파싱
 * @param {string} text — 사용자가 붙여넣은 원본 텍스트
 * @returns {{ index: number, raw: string, titleKo: string, bodyHtml: string }[]}
 */
export function parseNotices(text) {
  if (!text?.trim()) return [];

  const blocks = text.split(/\n\s*---\s*\n/).map((b) => b.trim()).filter(Boolean);

  return blocks.map((raw, i) => {
    // <h1> 또는 첫 번째 <p><strong>...</strong> 을 제목으로 추출
    const titleMatch =
      raw.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) ||
      raw.match(/<p[^>]*><strong>([\s\S]*?)<\/strong><\/p>/i);

    const titleKo = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
      : `공지 ${i + 1}`;

    return { index: i + 1, raw, titleKo, bodyHtml: raw };
  });
}

// ──────────────────────────────────────────────
// 배치 감사 실행
// ──────────────────────────────────────────────

/**
 * @param {{ index: number, raw: string, titleKo: string, bodyHtml: string }[]} notices
 * @param {number[]} [disabledRules=[]] — 비활성화된 규칙 ID
 * @returns {AuditRow[]}
 *
 * AuditRow: { index, titleKo, parseError, score, results, ruleMap }
 */
export function auditBatch(notices, disabledRules = []) {
  return notices.map((notice) => {
    if (notice.parseError) {
      return { ...notice, score: 0, results: [], ruleMap: {} };
    }

    let results = [];
    let parseError = null;
    try {
      results = checkAll(
        {
          titleKo:  notice.titleKo,
          titleEn:  '',
          category: 'general',
          department: '',
          bodyHtml: notice.bodyHtml,
          bodyDelta: { ops: [] },
        },
        disabledRules
      );
    } catch (err) {
      parseError = err.message;
    }

    const passed = results.filter((r) => r.passed).length;
    const total  = results.length || 1;
    const score  = parseError ? 0 : Math.round((passed / total) * 100);

    // ruleId → passed 빠른 조회
    const ruleMap = Object.fromEntries(results.map((r) => [r.id, r.passed]));

    return { ...notice, parseError, score, results, ruleMap };
  });
}

// ──────────────────────────────────────────────
// CSV 내보내기
// ──────────────────────────────────────────────

/**
 * 감사 결과를 CSV 파일로 다운로드
 * @param {AuditRow[]} rows
 * @param {number[]} [disabledRules=[]]
 */
export function exportCsv(rows, disabledRules = []) {
  if (!rows.length) return;

  const activeRules = RULES.filter((r) => !disabledRules.includes(r.id));
  const ruleHeaders = activeRules.map((r) => `규칙${r.id}_${r.name}`);

  const header = ['번호', '제목', '준수율(%)', '오류', ...ruleHeaders];

  const csvRows = rows.map((row) => {
    const ruleCols = activeRules.map((r) => {
      if (row.parseError) return '파싱오류';
      const val = row.ruleMap[r.id];
      return val === undefined ? '-' : val ? '통과' : '위반';
    });
    return [
      row.index,
      csvEscape(row.titleKo),
      row.parseError ? '' : row.score,
      csvEscape(row.parseError || ''),
      ...ruleCols,
    ];
  });

  const lines = [header, ...csvRows].map((cols) => cols.join(',')).join('\n');
  const bom   = '\uFEFF'; // Excel UTF-8 BOM
  const blob  = new Blob([bom + lines], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), {
    href: url,
    download: `batch-audit-${formatDate()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// 내부 유틸
// ──────────────────────────────────────────────

function csvEscape(str) {
  if (typeof str !== 'string') return str ?? '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
