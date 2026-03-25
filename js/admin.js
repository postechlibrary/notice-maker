/**
 * admin.js — 규칙 관리 Admin 설정
 *
 * localStorage key: 'notice-maker:admin'
 * 저장 형태: { disabledRules: number[], copyThreshold: number }
 *
 * COPY_THRESHOLD: 0.5 ~ 1.0 (0.1 단위), 기본값 1.0 (100%)
 */

const ADMIN_KEY        = 'notice-maker:admin';
const DEFAULT_THRESHOLD = 1.0;

// ──────────────────────────────────────────────
// 내부 헬퍼
// ──────────────────────────────────────────────

function loadRaw() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRaw(data) {
  try {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * Admin 설정 전체 로드 (없으면 기본값)
 * @returns {{ disabledRules: number[], copyThreshold: number }}
 */
export function loadAdminSettings() {
  const raw = loadRaw();
  return {
    disabledRules: raw?.disabledRules ?? [],
    copyThreshold: raw?.copyThreshold ?? DEFAULT_THRESHOLD,
  };
}

/**
 * Admin 설정 저장
 * @param {{ disabledRules?: number[], copyThreshold?: number }} partial
 */
export function saveAdminSettings(partial) {
  const current = loadAdminSettings();
  const updated  = { ...current, ...partial };
  // copyThreshold 범위 보정
  updated.copyThreshold = Math.min(1.0, Math.max(0.5, updated.copyThreshold));
  saveRaw(updated);
  return updated;
}

/**
 * 비활성화 규칙 ID 배열 반환
 * @returns {number[]}
 */
export function getDisabledRules() {
  return loadAdminSettings().disabledRules;
}

/**
 * 현재 COPY_THRESHOLD 값 반환
 * @returns {number}
 */
export function getCopyThreshold() {
  return loadAdminSettings().copyThreshold;
}

/**
 * 특정 규칙 ID의 활성/비활성 토글
 * @param {number} ruleId
 * @returns {boolean} 토글 후 비활성화 여부 (true = 비활성)
 */
export function toggleRule(ruleId) {
  const settings = loadAdminSettings();
  const disabled = new Set(settings.disabledRules);
  if (disabled.has(ruleId)) {
    disabled.delete(ruleId);
  } else {
    disabled.add(ruleId);
  }
  saveAdminSettings({ disabledRules: [...disabled] });
  return disabled.has(ruleId);
}

/**
 * 모든 설정 초기화
 */
export function resetAdminSettings() {
  saveRaw({ disabledRules: [], copyThreshold: DEFAULT_THRESHOLD });
}
