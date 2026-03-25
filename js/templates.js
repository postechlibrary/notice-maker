/**
 * templates.js — 카테고리별 본문 HTML 템플릿
 *
 * JS 문자열 상수로 인라인 관리. fetch 불필요 (오프라인 안전).
 * 각 템플릿: { html: string, description: string }
 */

const CONTACT_PLACEHOLDER =
  '<hr style="border:1px solid #ddd;margin:20px 0">' +
  '<p style="font-size:14px;color:#555">문의: [부서명] ([전화번호], [이메일])</p>';

/** 카테고리 → 템플릿 맵 */
export const TEMPLATES = {

  /** 일반 안내 */
  general: {
    description: '일반 안내 공지 — 서비스 소개, 변경사항 등',
    html: `<p>안녕하세요, 박태준학술정보관입니다.</p>
<p>다음과 같이 안내드립니다.</p>
<p><strong>1. 내용</strong></p>
<p>가. </p>
<p>나. </p>
<p><strong>2. 일정</strong></p>
<p>가. 일시: 2026.MM.DD(요일) 00:00 ~ 2026.MM.DD(요일) 00:00</p>
<p>나. 장소: </p>
${CONTACT_PLACEHOLDER}`,
  },

  /** 정기 행사 */
  event: {
    description: '정기 행사 — 설명회, 교육, 이벤트 등',
    html: `<p>안녕하세요, 박태준학술정보관입니다.</p>
<p>다음과 같이 [행사명] 행사를 안내드립니다.</p>
<p><strong>1. 행사 개요</strong></p>
<p>가. 일시: 2026.MM.DD(요일) 00:00</p>
<p>나. 장소: </p>
<p>다. 대상: </p>
<p><strong>2. 신청 방법</strong></p>
<p>가. 신청 기간: 2026.MM.DD(요일) ~ 2026.MM.DD(요일)</p>
<p>나. 신청 방법: </p>
<p><strong>3. 유의 사항</strong></p>
<p>가. </p>
${CONTACT_PLACEHOLDER}`,
  },

  /** 서비스 변경 */
  service: {
    description: '서비스 변경 — DB 구독 변경, 시스템 점검 등',
    html: `<p>안녕하세요, 박태준학술정보관입니다.</p>
<p>다음과 같이 [서비스명] 관련 사항을 안내드립니다.</p>
<p><strong>1. 변경(또는 점검) 내용</strong></p>
<p>가. </p>
<p><strong>2. 일정</strong></p>
<p>가. 기간: 2026.MM.DD(요일) 00:00 ~ 2026.MM.DD(요일) 00:00</p>
<p><strong>3. 영향 범위</strong></p>
<p>가. 영향받는 서비스: </p>
<p>나. 대안: </p>
${CONTACT_PLACEHOLDER}`,
  },

  /** 긴급 공지 */
  urgent: {
    description: '긴급 공지 — 긴급한 상황, 임시 운영 변경 등',
    html: `<p>안녕하세요, 박태준학술정보관입니다.</p>
<p>긴급한 사항을 안내드립니다.</p>
<p><strong>1. 상황</strong></p>
<p>가. </p>
<p><strong>2. 조치 내용</strong></p>
<p>가. </p>
<p><strong>3. 복구 예정</strong></p>
<p>가. 예정 일시: 2026.MM.DD(요일) 00:00</p>
${CONTACT_PLACEHOLDER}`,
  },

};

/**
 * 카테고리에 맞는 템플릿 HTML 반환
 * @param {string} category - 'general' | 'event' | 'service' | 'urgent'
 * @returns {string} HTML 문자열
 */
export function getTemplate(category) {
  return TEMPLATES[category]?.html ?? TEMPLATES.general.html;
}
