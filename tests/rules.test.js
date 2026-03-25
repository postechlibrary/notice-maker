/**
 * tests/rules.test.js — 10개 규칙 check/fix 단위 테스트 (Vitest)
 *
 * 각 규칙: 통과 케이스, 위반 케이스, fix 케이스 커버
 */

import { describe, it, expect } from 'vitest';
import { checkAll, fixRule, calcScore } from '../js/rules.js';

// ──────────────────────────────────────────────
// 테스트 데이터 헬퍼
// ──────────────────────────────────────────────

function makeData(overrides = {}) {
  return {
    titleKo:    '도서관 서비스 안내',
    titleEn:    'Library Service Guide',
    category:   'general',
    department: '학술서비스팀',
    bodyHtml:   '<p>안녕하세요, 박태준학술정보관입니다.</p><p>문의: 학술서비스팀 (054-000-0000, lib@postech.ac.kr)</p>',
    bodyDelta:  { ops: [] },
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// 규칙 1: 연도 표기 통일
// ──────────────────────────────────────────────

describe('규칙 1: 연도 표기 통일', () => {
  it('표준 표기 — 통과', () => {
    const data = makeData({ titleKo: '2026년도 1학기 대출 서비스 안내' });
    const results = checkAll(data);
    expect(results[0].passed).toBe(true);
  });

  it('비표준 표기 (2026-1) — 위반', () => {
    const data = makeData({ titleKo: '2026-1 대출 서비스 안내' });
    const results = checkAll(data);
    expect(results[0].passed).toBe(false);
  });

  it('fix — 제목 변환', () => {
    const data = makeData({ titleKo: '2026-1 대출 서비스 안내' });
    const fixed = fixRule(1, data);
    expect(fixed.titleKo).toContain('2026년도 1학기');
    expect(fixed.titleKo).not.toMatch(/2026-1/);
  });

  it('fix — 본문 변환', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>2026-2학기 일정 안내드립니다. 문의: 팀</p>',
    });
    const fixed = fixRule(1, data);
    expect(fixed.bodyHtml).toContain('2026년도 2학기');
  });
});

// ──────────────────────────────────────────────
// 규칙 2: 접미사 통일
// ──────────────────────────────────────────────

describe('규칙 2: 접미사 통일', () => {
  it('"안내"로 끝나는 제목 — 통과', () => {
    const data = makeData({ titleKo: '대출 서비스 안내', category: 'general' });
    const results = checkAll(data);
    expect(results[1].passed).toBe(true);
  });

  it('"공지"로 끝나는 일반 공지 — 위반', () => {
    const data = makeData({ titleKo: '대출 서비스 공지', category: 'general' });
    const results = checkAll(data);
    expect(results[1].passed).toBe(false);
  });

  it('"공지"로 끝나는 긴급 공지 — 통과', () => {
    const data = makeData({ titleKo: '시스템 긴급 공지', category: 'urgent' });
    const results = checkAll(data);
    expect(results[1].passed).toBe(true);
  });

  it('fix — "공지" → "안내" 변환', () => {
    const data = makeData({ titleKo: '대출 서비스 공지', category: 'general' });
    const fixed = fixRule(2, data);
    expect(fixed.titleKo).toBe('대출 서비스 안내');
  });

  it('fix — 접미사 없으면 "안내" 추가', () => {
    const data = makeData({ titleKo: '대출 서비스', category: 'general' });
    const fixed = fixRule(2, data);
    expect(fixed.titleKo).toMatch(/안내$/);
  });
});

// ──────────────────────────────────────────────
// 규칙 3: 영문 제목 필수 (감지만)
// ──────────────────────────────────────────────

describe('규칙 3: 영문 제목 필수', () => {
  it('영문 제목 있음 — 통과', () => {
    const data = makeData({ titleEn: 'Library Service Guide' });
    const results = checkAll(data);
    expect(results[2].passed).toBe(true);
  });

  it('영문 제목 없음 — 위반', () => {
    const data = makeData({ titleEn: '' });
    const results = checkAll(data);
    expect(results[2].passed).toBe(false);
  });

  it('fix — 원본 데이터 그대로 반환 (자동수정 불가)', () => {
    const data = makeData({ titleEn: '' });
    const fixed = fixRule(3, data);
    expect(fixed.titleEn).toBe('');
  });
});

// ──────────────────────────────────────────────
// 규칙 4: 괄호 사용 (감지만)
// ──────────────────────────────────────────────

describe('규칙 4: 괄호 사용 규칙', () => {
  it('약어 외 괄호 없음 — 통과', () => {
    const data = makeData({ titleKo: 'APC 관련 안내' });
    const results = checkAll(data);
    expect(results[3].passed).toBe(true);
  });

  it('안내성 괄호 포함 — 위반', () => {
    const data = makeData({
      titleKo: '세부 사항은 아래를 참고',
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>(세부 사항은 아래를 참고하세요) 문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[3].passed).toBe(false);
  });
});

// ──────────────────────────────────────────────
// 규칙 5: 도입부 인삿말
// ──────────────────────────────────────────────

describe('규칙 5: 도입부 인삿말', () => {
  it('표준 인삿말 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[4].passed).toBe(true);
  });

  it('인삿말 없음 — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>다음과 같이 안내드립니다. 문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[4].passed).toBe(false);
  });

  it('빈 본문 — 위반', () => {
    const data = makeData({ bodyHtml: '' });
    const results = checkAll(data);
    expect(results[4].passed).toBe(false);
  });

  it('fix — 인삿말 삽입', () => {
    const data = makeData({
      bodyHtml: '<p>다음과 같이 안내드립니다. 문의: 팀</p>',
    });
    const fixed = fixRule(5, data);
    expect(fixed.bodyHtml).toMatch(/안녕하세요.*박태준학술정보관/);
    expect(fixed.bodyHtml.indexOf('<p>안녕하세요')).toBe(0);
  });
});

// ──────────────────────────────────────────────
// 규칙 6: 번호 체계 통일
// ──────────────────────────────────────────────

describe('규칙 6: 번호 체계 통일', () => {
  it('표준 번호 체계 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>1. 항목</p><p>가. 세부항목</p><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[5].passed).toBe(true);
  });

  it('비표준 기호 (* 기호) — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>* 항목 내용</p><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[5].passed).toBe(false);
  });
});

// ──────────────────────────────────────────────
// 규칙 7: 일시·기간 표기
// ──────────────────────────────────────────────

describe('규칙 7: 일시·기간 표기', () => {
  it('표준 날짜 형식 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>2026.03.05(목) 09:00 문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[6].passed).toBe(true);
  });

  it('한 자리 월/일/시 — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>2026.3.5(목) 9:00 문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[6].passed).toBe(false);
  });

  it('fix — 두 자리 패딩 적용', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>2026.3.5(목) 9:00 문의: 팀</p>',
    });
    const fixed = fixRule(7, data);
    expect(fixed.bodyHtml).toContain('2026.03.05(목) 09:00');
  });
});

// ──────────────────────────────────────────────
// 규칙 8: 문의처 형식
// ──────────────────────────────────────────────

describe('규칙 8: 문의처 형식', () => {
  it('문의처 블록 있음 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>문의: 학술서비스팀 (054-000-0000)</p>',
    });
    const results = checkAll(data);
    expect(results[7].passed).toBe(true);
  });

  it('문의처 없음 — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>서비스 변경 안내입니다.</p>',
    });
    const results = checkAll(data);
    expect(results[7].passed).toBe(false);
  });

  it('fix — 문의처 블록 삽입', () => {
    const data = makeData({
      bodyHtml:   '<p>안녕하세요, 박태준학술정보관입니다.</p><p>내용입니다.</p>',
      department: '학술서비스팀',
    });
    const fixed = fixRule(8, data);
    expect(fixed.bodyHtml).toMatch(/문의.*학술서비스팀/);
  });
});

// ──────────────────────────────────────────────
// 규칙 9: 영문 병기 (감지만)
// ──────────────────────────────────────────────

describe('규칙 9: 영문 병기', () => {
  it('영문 서비스명 있음 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><p>RISS 데이터베이스 서비스 안내드립니다. 문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[8].passed).toBe(true);
  });
});

// ──────────────────────────────────────────────
// 규칙 10: 이미지 alt 텍스트 (감지만)
// ──────────────────────────────────────────────

describe('규칙 10: 이미지 alt 텍스트', () => {
  it('alt 있는 이미지 — 통과', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><img src="test.png" alt="이미지 설명"><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[9].passed).toBe(true);
  });

  it('alt 없는 이미지 — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><img src="test.png"><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[9].passed).toBe(false);
  });

  it('alt 빈 문자열 — 위반', () => {
    const data = makeData({
      bodyHtml: '<p>안녕하세요, 박태준학술정보관입니다.</p><img src="test.png" alt=""><p>문의: 팀</p>',
    });
    const results = checkAll(data);
    expect(results[9].passed).toBe(false);
  });
});

// ──────────────────────────────────────────────
// checkAll: 비활성화 규칙
// ──────────────────────────────────────────────

describe('checkAll: 비활성화 규칙', () => {
  it('비활성화 규칙 → 자동 통과', () => {
    const data = makeData({ titleEn: '' }); // 규칙 3 위반
    const results = checkAll(data, [3]);
    const rule3 = results.find((r) => r.id === 3);
    expect(rule3.passed).toBe(true);
    expect(rule3.message).toContain('비활성화');
  });
});

// ──────────────────────────────────────────────
// 규칙 오류 격리
// ──────────────────────────────────────────────

describe('규칙 오류 격리', () => {
  it('하나의 규칙 오류가 나머지 규칙 실행을 방해하지 않음', () => {
    // null bodyHtml로 일부 규칙이 예외를 던질 수 있는 극단적 입력
    const data = {
      titleKo: '', titleEn: '', category: 'general',
      department: '', bodyHtml: null, bodyDelta: null,
    };
    expect(() => checkAll(data)).not.toThrow();
    const results = checkAll(data);
    expect(results).toHaveLength(10);
  });
});

// ──────────────────────────────────────────────
// calcScore
// ──────────────────────────────────────────────

describe('calcScore', () => {
  it('모두 통과 → 1.0', () => {
    const results = Array.from({ length: 10 }, () => ({ passed: true }));
    expect(calcScore(results)).toBe(1.0);
  });

  it('5개 통과 → 0.5', () => {
    const results = [
      ...Array.from({ length: 5 }, () => ({ passed: true })),
      ...Array.from({ length: 5 }, () => ({ passed: false })),
    ];
    expect(calcScore(results)).toBe(0.5);
  });

  it('빈 배열 → 0', () => {
    expect(calcScore([])).toBe(0);
  });
});
