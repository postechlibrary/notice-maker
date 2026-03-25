/**
 * rules.js — 10개 가이드라인 검증 규칙
 *
 * 각 규칙: { id, name, tooltip, check(data), fix(data) }
 *   check(data) → { passed: bool, message: string }
 *   fix(data)   → { ...data, [수정된 필드] }  (순수 함수, 원본 변경 없음)
 *
 * data 형식:
 *   { titleKo, titleEn, category, department, bodyHtml, bodyDelta }
 */

// ──────────────────────────────────────────────
// 공통 헬퍼
// ──────────────────────────────────────────────

/** bodyHtml에서 plain text 추출 (간단 strip) */
function htmlToText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** bodyHtml의 첫 번째 텍스트 블록(단락) 반환 */
function firstParagraphText(html) {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (!match) return htmlToText(html).split('\n')[0] ?? '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

/** 표준 인삿말 */
const GREETING = '안녕하세요, 박태준학술정보관입니다.';

/** 표준 문의처 블록 HTML */
function contactBlock(department) {
  const dept = department || '담당부서';
  return `<hr style="border:1px solid #ddd;margin:20px 0"><p style="font-size:14px;color:#555">문의: ${dept} (전화번호, 이메일)</p>`;
}

// ──────────────────────────────────────────────
// 규칙 정의
// ──────────────────────────────────────────────

const rules = [

  // ── 규칙 1: 연도 표기 통일 ──
  {
    id: 1,
    name: '연도 표기 통일',
    tooltip: { bad: '2026-1학기', good: '2026년도 1학기' },
    check(data) {
      // YYYY-N 또는 YYYY-NN 패턴 (예: 2026-1, 2025-2) 감지
      const pattern = /\b(20\d{2})-([12])\b/;
      const inTitle  = pattern.test(data.titleKo);
      const inBody   = pattern.test(htmlToText(data.bodyHtml));
      const passed   = !inTitle && !inBody;
      return {
        passed,
        message: passed ? '연도 표기 형식이 올바릅니다.' : `비표준 연도 표기 발견 (예: 2026-1 → 2026년도 1학기)`,
      };
    },
    fix(data) {
      const replace = (str) =>
        str.replace(/\b(20\d{2})-([12])\b/g, (_, y, s) =>
          `${y}년도 ${s === '1' ? '1' : '2'}학기`
        );
      return {
        ...data,
        titleKo:  replace(data.titleKo),
        bodyHtml: data.bodyHtml.replace(
          /\b(20\d{2})-([12])\b/g,
          (_, y, s) => `${y}년도 ${s === '1' ? '1' : '2'}학기`
        ),
      };
    },
  },

  // ── 규칙 2: 접미사 통일 ──
  {
    id: 2,
    name: '제목 접미사 통일',
    tooltip: { bad: '대출 서비스 공지', good: '대출 서비스 안내' },
    check(data) {
      const isUrgent = data.category === 'urgent';
      const endsWithAnui  = /안내$/.test(data.titleKo.trim());
      const endsWithGongji = /공지$/.test(data.titleKo.trim());
      const endsWithOther = !endsWithAnui && !endsWithGongji;

      // 긴급 공지: '공지' 허용
      // 그 외: '안내'로만 끝나야 함
      let passed;
      let message;
      if (isUrgent) {
        passed  = endsWithAnui || endsWithGongji;
        message = passed ? '긴급 공지 접미사가 올바릅니다.' : '긴급 공지는 제목이 "안내" 또는 "공지"로 끝나야 합니다.';
      } else {
        passed  = endsWithAnui;
        message = passed
          ? '제목 접미사가 "안내"로 올바릅니다.'
          : endsWithGongji
            ? '일반 공지는 "공지" 대신 "안내"를 사용해야 합니다.'
            : '제목이 "안내"로 끝나야 합니다.';
      }
      return { passed, message };
    },
    fix(data) {
      if (data.category === 'urgent') return data; // 긴급은 수동
      let title = data.titleKo.trim();
      // '공지' → '안내' 교체
      if (/공지$/.test(title)) {
        title = title.replace(/공지$/, '안내');
      } else if (!/안내$/.test(title)) {
        // 이미 '안내'가 포함된 경우: 끝이 아닌 것이므로 자동 수정 불가 (수동 편집 필요)
        if (/안내/.test(title)) return data;
        title = title + ' 안내';
      }
      return { ...data, titleKo: title };
    },
  },

  // ── 규칙 3: 영문 제목 필수 (감지만) ──
  {
    id: 3,
    name: '영문 제목 필수',
    tooltip: { bad: '(비어 있음)', good: 'Spring 2026 Loan Service Guide' },
    check(data) {
      const passed = data.titleEn.trim().length > 0;
      return {
        passed,
        message: passed ? '영문 제목이 입력되었습니다.' : '영문 제목을 입력해 주세요.',
      };
    },
    fix(data) { return data; }, // 자동수정 불가
  },

  // ── 규칙 4: 괄호 사용 규칙 (감지만) ──
  {
    id: 4,
    name: '괄호 사용 규칙',
    tooltip: { bad: '(아래 참조)', good: 'APC(Article Processing Charge)처럼 약어 설명에만 사용' },
    check(data) {
      // 약어 패턴 외의 괄호: 영문 대문자로 시작하지 않는 소괄호 내용 감지
      const bodyText = htmlToText(data.bodyHtml);
      const titleText = data.titleKo;
      // 세부 판단은 어렵지만, "참고", "문의", "자세한" 등 안내성 괄호 감지
      const infoPattern = /\([가-힣\s]{3,}\)/;
      const passed = !infoPattern.test(bodyText) && !infoPattern.test(titleText);
      return {
        passed,
        message: passed
          ? '괄호 사용이 적절합니다.'
          : '약어 설명 외의 괄호 사용이 감지되었습니다. 직접 확인해 주세요.',
      };
    },
    fix(data) { return data; }, // 의미 판단 필요 — 자동수정 불가
  },

  // ── 규칙 5: 도입부 인삿말 ──
  {
    id: 5,
    name: '도입부 인삿말',
    tooltip: { bad: '(인삿말 없음)', good: '안녕하세요, 박태준학술정보관입니다.' },
    check(data) {
      if (!data.bodyHtml.trim()) {
        return { passed: false, message: '본문이 비어 있습니다.' };
      }
      const first = firstParagraphText(data.bodyHtml);
      const passed = first.includes('안녕하세요') && first.includes('박태준학술정보관');
      return {
        passed,
        message: passed
          ? '인삿말이 올바르게 시작됩니다.'
          : `첫 단락에 표준 인삿말이 없습니다. ("${GREETING}")`,
      };
    },
    fix(data) {
      if (!data.bodyHtml.trim()) {
        return {
          ...data,
          bodyHtml: `<p>${GREETING}</p>`,
        };
      }
      const first = firstParagraphText(data.bodyHtml);
      if (first.includes('안녕하세요') && first.includes('박태준학술정보관')) {
        return data;
      }
      // 본문 맨 앞에 인삿말 단락 삽입
      return {
        ...data,
        bodyHtml: `<p>${GREETING}</p>${data.bodyHtml}`,
      };
    },
  },

  // ── 규칙 6: 번호 체계 통일 ──
  // Quill Delta 파싱 spike 결과에 따라 fix 업그레이드 예정
  // 현재: HTML에서 비표준 기호 감지, fix는 기본 기호 제거 시도
  {
    id: 6,
    name: '번호 체계 통일',
    tooltip: { bad: '* 항목  또는  ○ 항목', good: '1. 항목 / 가. 세부항목 / 1) 소항목' },
    check(data) {
      const html = data.bodyHtml || '';
      // 비표준 리스트 기호: *, ○, ·, •, -, △ 등이 태그 직후에 나타날 때
      // raw HTML에서 검사: <p>* 항목 → >* 항목 패턴
      const nonStdPattern = />\s*[*○·•△▶→]\s+\S/;
      const passed = !nonStdPattern.test(html);
      return {
        passed,
        message: passed
          ? '번호 체계가 표준 형식을 따릅니다.'
          : '비표준 리스트 기호(*, ○, · 등)가 감지되었습니다. 1./가./1) 체계로 변환하세요.',
      };
    },
    fix(data) {
      // Delta 파싱 spike 완료 전: 단순 텍스트 치환으로 기본 변환
      // TODO: Quill Delta 파싱 spike 완료 후 Delta 기반 변환으로 교체
      let counter = 1;
      const html = data.bodyHtml.replace(
        /(<li[^>]*>)\s*[*○·•△▶→]\s*/g,
        (_, tag) => `${tag}${counter++}. `
      );
      return { ...data, bodyHtml: html };
    },
  },

  // ── 규칙 7: 일시·기간 표기 ──
  {
    id: 7,
    name: '일시·기간 표기',
    tooltip: { bad: '2026.3.5(목) 9:00', good: '2026.03.05(목) 09:00' },
    check(data) {
      const bodyText = htmlToText(data.bodyHtml);
      // 날짜 패턴: YYYY.M.D 또는 YYYY.MM.DD (요일 유무 무관)
      const datePattern = /\b(20\d{2})\.(0?[1-9]|1[0-2])\.(0?[1-9]|[12]\d|3[01])\b/g;
      const dateMatches = [...bodyText.matchAll(datePattern)];
      // 시간 패턴: H:MM 또는 HH:MM
      const timePattern = /\b(\d{1,2}):(\d{2})\b/g;
      const timeMatches = [...bodyText.matchAll(timePattern)];

      if (dateMatches.length === 0 && timeMatches.length === 0) {
        return { passed: true, message: '날짜·시간 표기 형식이 올바릅니다.' };
      }

      const badDate = dateMatches.find(m => m[2].length < 2 || m[3].length < 2);
      const badTime = timeMatches.find(m => m[1].length < 2);
      const hasIssue = !!(badDate || badTime);

      const sample = badDate ? badDate[0] : badTime ? badTime[0] : '';
      return {
        passed: !hasIssue,
        message: hasIssue
          ? `날짜/시간 한 자리 표기 발견: "${sample}" → 두 자리 형식(YYYY.MM.DD HH:MM)으로 변환하세요.`
          : '날짜·시간 표기 형식이 올바릅니다.',
      };
    },
    fix(data) {
      // 날짜 패딩 (요일 유무 무관)
      let html = data.bodyHtml.replace(
        /\b(20\d{2})\.(0?[1-9]|1[0-2])\.(0?[1-9]|[12]\d|3[01])(\([^)]\))?\b/g,
        (_, y, m, d, dow) =>
          `${y}.${m.padStart(2,'0')}.${d.padStart(2,'0')}${dow ?? ''}`
      );
      // 시간 패딩
      html = html.replace(
        /\b(\d{1}):(\d{2})\b/g,
        (_, h, min) => `0${h}:${min}`
      );
      return { ...data, bodyHtml: html };
    },
  },

  // ── 규칙 8: 문의처 형식 ──
  {
    id: 8,
    name: '문의처 형식',
    tooltip: { bad: '(문의처 없음 또는 상단에 위치)', good: '마지막에: 문의: 부서명 (전화, 이메일)' },
    check(data) {
      if (!data.bodyHtml.trim()) {
        return { passed: false, message: '본문이 비어 있습니다.' };
      }
      // 본문 끝에 문의처 패턴 확인
      const bodyText = htmlToText(data.bodyHtml);
      const passed = /문의\s*[:：].+/.test(bodyText);
      return {
        passed,
        message: passed
          ? '문의처 블록이 있습니다.'
          : '본문 마지막에 문의처 블록이 없습니다. 자동으로 삽입하려면 수정 버튼을 클릭하세요.',
      };
    },
    fix(data) {
      if (/문의\s*[:：].+/.test(htmlToText(data.bodyHtml))) return data;
      return {
        ...data,
        bodyHtml: data.bodyHtml + contactBlock(data.department),
      };
    },
  },

  // ── 규칙 9: 영문 병기 (감지만) ──
  {
    id: 9,
    name: '주요 항목 영문 병기',
    tooltip: { bad: '스콜라', good: 'SCOPUS(스콜라스) 등 영문 병기' },
    // 알려진 서비스명 목록 (확장 가능)
    _knownServices: ['RISS', 'NDSL', 'SCOPUS', 'Web of Science', 'KERIS', 'EBSCO', 'ProQuest'],
    check(data) {
      const bodyText = htmlToText(data.bodyHtml);
      // 알려진 서비스명이 한글 근처에 영문 없이 나타나는지 (단순 감지)
      // 실제로는 한글 전사 표기 감지가 어려워 역방향 감지: 영문 서비스명이 있으면 pass
      const hasEnglishService = this._knownServices.some(svc =>
        bodyText.toUpperCase().includes(svc.toUpperCase())
      );
      // 본문에 DB/서비스 관련 키워드가 있는지 확인
      const hasServiceKeyword = /데이터베이스|서비스|도서관|검색/.test(bodyText);

      // 키워드가 있는데 영문 서비스명이 하나도 없으면 경고
      const passed = !hasServiceKeyword || hasEnglishService;
      return {
        passed,
        message: passed
          ? '영문 서비스명 병기가 확인됩니다.'
          : '서비스/DB 관련 내용이 있습니다. 주요 서비스명 영문 병기를 확인하세요. (예: RISS, SCOPUS)',
      };
    },
    fix(data) { return data; }, // 내용 판단 필요 — 자동수정 불가
  },

  // ── 규칙 10: 이미지 alt 텍스트 (감지만) ──
  {
    id: 10,
    name: '이미지 alt 텍스트',
    tooltip: { bad: '<img src="...">', good: '<img src="..." alt="그래프 설명">' },
    check(data) {
      const imgPattern = /<img(?![^>]*\balt\s*=\s*["'][^"']+["'])[^>]*>/i;
      const passed = !imgPattern.test(data.bodyHtml);
      return {
        passed,
        message: passed
          ? '모든 이미지에 alt 텍스트가 있습니다.'
          : 'alt 텍스트가 없는 이미지가 있습니다. 이미지마다 설명을 추가해 주세요.',
      };
    },
    fix(data) { return data; }, // 내용 작성 필요 — 자동수정 불가
  },

];

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * 모든 규칙 검증
 * @param {object} data
 * @param {string[]} [disabledRules] - 비활성화된 규칙 id 배열
 * @returns {{ id, name, passed, message, canFix }[]}
 */
export function checkAll(data, disabledRules = []) {
  return rules.map((rule) => {
    // 비활성화 규칙 → 자동 통과
    if (disabledRules.includes(rule.id)) {
      return { id: rule.id, name: rule.name, passed: true, message: '(비활성화됨)', canFix: false };
    }
    try {
      const result = rule.check(data);
      return {
        id:      rule.id,
        name:    rule.name,
        tooltip: rule.tooltip,
        passed:  result.passed,
        message: result.message,
        canFix:  typeof rule.fix === 'function' && rule.id !== 3 && rule.id !== 4 && rule.id !== 9 && rule.id !== 10,
      };
    } catch (err) {
      console.error(`[rules] 규칙 ${rule.id} 오류:`, err);
      return { id: rule.id, name: rule.name, passed: false, message: 'ERROR', canFix: false };
    }
  });
}

/**
 * 단일 규칙 자동수정
 * @param {number} ruleId
 * @param {object} data
 * @returns {object} 수정된 data (순수 함수)
 */
export function fixRule(ruleId, data) {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`규칙 ${ruleId}를 찾을 수 없습니다.`);
  try {
    return rule.fix(data);
  } catch (err) {
    console.error(`[rules] 규칙 ${ruleId} fix 오류:`, err);
    return data;
  }
}

/** 준수율 계산 (0.0 ~ 1.0) */
export function calcScore(results) {
  if (!results.length) return 0;
  const passed = results.filter((r) => r.passed).length;
  return passed / results.length;
}

export { rules };
