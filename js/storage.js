/**
 * storage.js — localStorage 래퍼 (자동저장 · 버전 히스토리 · 템플릿 라이브러리)
 *
 * Keys:
 *   notice-maker:autosave   — 단일 객체 {savedAt, ...editorData}
 *   notice-maker:history    — 스냅샷 배열 (최대 MAX_HISTORY개)
 *   notice-maker:templates  — 템플릿 배열 (최대 MAX_TEMPLATES개)
 */

const PREFIX      = 'notice-maker:';
const MAX_HISTORY   = 5;
const MAX_TEMPLATES = 20;

// ──────────────────────────────────────────────
// 내부 헬퍼
// ──────────────────────────────────────────────

function lsGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // QuotaExceededError 등 방어
    return false;
  }
}

function lsRemove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch { /* noop */ }
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ──────────────────────────────────────────────
// 자동저장 (autosave) — 단일 슬롯
// ──────────────────────────────────────────────

/**
 * @param {object} data — 에디터 상태 (category, titleKo, titleEn, department, date, bodyHtml)
 * @returns {boolean} 저장 성공 여부
 */
export function saveAutosave(data) {
  return lsSet('autosave', { ...data, savedAt: new Date().toISOString() });
}

/**
 * @returns {{ savedAt: string, ...editorData } | null}
 */
export function loadAutosave() {
  return lsGet('autosave');
}

export function clearAutosave() {
  lsRemove('autosave');
}

// ──────────────────────────────────────────────
// 버전 히스토리 — 스냅샷 (최대 MAX_HISTORY개)
// ──────────────────────────────────────────────

/**
 * 현재 상태를 스냅샷으로 저장
 * @param {object} data — 에디터 상태
 * @param {string} [label] — 사용자 레이블 (기본: 날짜·시간)
 * @returns {object} 저장된 스냅샷 객체
 */
export function saveSnapshot(data, label) {
  const history = lsGet('history') ?? [];
  const snapshot = {
    id: makeId(),
    label: label ?? formatDate(new Date()),
    savedAt: new Date().toISOString(),
    ...data,
  };
  // 최신순 prepend, 최대 MAX_HISTORY개 유지
  const trimmed = [snapshot, ...history].slice(0, MAX_HISTORY);
  lsSet('history', trimmed);
  return snapshot;
}

/**
 * @returns {object[]} 최신순 스냅샷 배열
 */
export function loadHistory() {
  return lsGet('history') ?? [];
}

/**
 * @param {string} id — 삭제할 스냅샷 id
 */
export function deleteSnapshot(id) {
  const history = lsGet('history') ?? [];
  lsSet('history', history.filter(s => s.id !== id));
}

// ──────────────────────────────────────────────
// 템플릿 라이브러리 (최대 MAX_TEMPLATES개)
// ──────────────────────────────────────────────

/**
 * 현재 상태를 템플릿으로 저장 (이름 중복 시 덮어쓰기)
 * @param {string} name — 템플릿 이름
 * @param {object} data — 에디터 상태
 * @returns {object} 저장된 템플릿 객체
 */
export function saveTemplate(name, data) {
  const templates = lsGet('templates') ?? [];
  const template = {
    id: makeId(),
    name: name.trim(),
    savedAt: new Date().toISOString(),
    ...data,
  };
  // 동일 이름 제거 후 prepend
  const deduped = templates.filter(t => t.name !== template.name);
  const trimmed = [template, ...deduped].slice(0, MAX_TEMPLATES);
  lsSet('templates', trimmed);
  return template;
}

/**
 * @returns {object[]} 템플릿 배열 (최신순)
 */
export function loadTemplates() {
  return lsGet('templates') ?? [];
}

/**
 * @param {string} id
 */
export function deleteTemplate(id) {
  const templates = lsGet('templates') ?? [];
  lsSet('templates', templates.filter(t => t.id !== id));
}

// ──────────────────────────────────────────────
// 내보내기 / 가져오기
// ──────────────────────────────────────────────

/**
 * 템플릿 전체를 JSON 파일로 다운로드
 */
export function exportTemplates() {
  const templates = loadTemplates();
  const json = JSON.stringify({ version: 1, templates }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `notice-maker-templates-${formatDate(new Date(), true)}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON 문자열(또는 파일 텍스트)을 파싱해 기존 템플릿에 병합
 * @param {string} json
 * @returns {{ added: number, skipped: number }} 결과 통계
 */
export function importTemplates(json) {
  let imported;
  try {
    const parsed = JSON.parse(json);
    imported = Array.isArray(parsed) ? parsed : (parsed.templates ?? []);
  } catch {
    return { added: 0, skipped: 0 };
  }

  const existing = loadTemplates();
  const existingNames = new Set(existing.map(t => t.name));
  let added = 0, skipped = 0;

  for (const tpl of imported) {
    if (!tpl?.name) { skipped++; continue; }
    if (existingNames.has(tpl.name)) { skipped++; continue; }
    existingNames.add(tpl.name);
    added++;
    existing.push({ ...tpl, id: makeId(), importedAt: new Date().toISOString() });
  }

  lsSet('templates', existing.slice(0, MAX_TEMPLATES));
  return { added, skipped };
}

// ──────────────────────────────────────────────
// 스토리지 사용 가능 여부 확인
// ──────────────────────────────────────────────

/**
 * localStorage 접근 가능 여부 (Pake/Tauri 등 환경 방어)
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = PREFIX + '__test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// 내부 유틸
// ──────────────────────────────────────────────

function formatDate(date, compact = false) {
  const Y  = date.getFullYear();
  const M  = String(date.getMonth() + 1).padStart(2, '0');
  const D  = String(date.getDate()).padStart(2, '0');
  const h  = String(date.getHours()).padStart(2, '0');
  const m  = String(date.getMinutes()).padStart(2, '0');
  return compact
    ? `${Y}${M}${D}-${h}${m}`
    : `${Y}-${M}-${D} ${h}:${m}`;
}
