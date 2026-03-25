/**
 * app.js — 상태 관리 & 이벤트 브릿지 (ES Module 진입점)
 *
 * 모듈 통신: CustomEvent 버스
 *   editor:change  → { bodyHtml, bodyDelta }
 *   meta:change    → { titleKo, titleEn, category, department, date }
 *   rules:results  → { results, score }
 *
 * 준수율 COPY_THRESHOLD: Admin Panel에서 동적 설정 (기본 100%)
 */

import * as editor    from './editor.js';
import * as preview   from './preview.js';
import * as htmlOut   from './htmlOutput.js';
import { checkAll, fixRule, calcScore, rules as ALL_RULES } from './rules.js';
import { getTemplate }                  from './templates.js';
import { generateDiff }                 from './diff.js';
import {
  saveAutosave, loadAutosave, clearAutosave,
  saveSnapshot, loadHistory, deleteSnapshot,
  saveTemplate, loadTemplates, deleteTemplate,
  exportTemplates, importTemplates,
  isStorageAvailable,
} from './storage.js';
import {
  loadAdminSettings, saveAdminSettings, toggleRule, resetAdminSettings,
} from './admin.js';
import { parseNotices, auditBatch, exportCsv } from './batch.js';
import { suggestEnglishTitle, loadDeeplKey, saveDeeplKey } from './translate.js';

// ──────────────────────────────────────────────
// 자동수정 가능 규칙 ID
// ──────────────────────────────────────────────

const FIXABLE_RULES = new Set([1, 2, 5, 6, 7, 8]);

// ──────────────────────────────────────────────
// 상태
// ──────────────────────────────────────────────

const state = {
  titleKo:    '',
  titleEn:    '',
  category:   'general',
  department: '',
  date:       '',
  bodyHtml:   '',
  bodyDelta:  { ops: [] },
  // 비활성화된 규칙 ID 목록 (Admin Panel에서 관리)
  disabledRules: loadAdminSettings().disabledRules,
  // 마지막 검증 결과 (자동수정 탭 렌더링에 사용)
  lastResults: [],
};

// COPY_THRESHOLD는 admin 설정에서 동적 로드
function getCopyThresholdSetting() {
  return loadAdminSettings().copyThreshold;
}

// ──────────────────────────────────────────────
// DOM 참조
// ──────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const elCategory        = $('#category');
const elTitleKo         = $('#title-ko');
const elTitleEn         = $('#title-en');
const elDepartment      = $('#department');
const elDate            = $('#notice-date');
const elComplianceScore = $('#compliance-score');
const elComplianceFill  = $('#compliance-fill');
const elBtnCopy         = $('#btn-copy');
const elBtnCopyHtml     = $('#btn-copy-html');
const elRulesList       = $('#rules-list');
const elHtmlCode        = $('#html-output-code code');
const elClipboardModal  = $('#clipboard-modal');
const elModalClose      = $('#modal-close');
const elModalTextarea   = $('#modal-textarea');
const elPreviewContainer= $('#preview-container');
const elFixList         = $('#fix-list');
const elFixCount        = $('#fix-count');
const elBtnFixAll       = $('#btn-fix-all');

// 3단계: storage UI
const elAutosaveBanner  = $('#autosave-banner');
const elAutosaveMsg     = $('#autosave-msg');
const elBtnRestore      = $('#btn-restore');
const elBtnDiscard      = $('#btn-discard');
const elBtnSave         = $('#btn-save');

const elStorageModal    = $('#storage-modal');
const elStorageClose    = $('#storage-modal-close');
const elStorageBackdrop = $('#storage-modal-backdrop');
const elBtnSnapshot     = $('#btn-snapshot');
const elHistoryList     = $('#history-list');
const elBtnSaveTpl      = $('#btn-save-tpl');
const elBtnExportTpl    = $('#btn-export-tpl');
const elBtnImportTpl    = $('#btn-import-tpl');
const elImportFileInput = $('#import-file-input');
const elTemplateList    = $('#template-list');

const elTplNameModal    = $('#tpl-name-modal');
const elTplNameClose    = $('#tpl-name-close');
const elTplNameInput    = $('#tpl-name-input');
const elTplNameConfirm  = $('#tpl-name-confirm');
const elTplNameCancel   = $('#tpl-name-cancel');

// 자동저장 인터벌 핸들 (5분)
const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
let   autosaveTimer = null;

// 4단계: Admin DOM 참조
const elAdminModal        = $('#admin-modal');
const elAdminModalClose   = $('#admin-modal-close');
const elAdminModalBackdrop= $('#admin-modal-backdrop');
const elBtnAdmin          = $('#btn-admin');
const elBtnAdminReset     = $('#btn-admin-reset');
const elBtnAdminClose     = $('#btn-admin-close');
const elThresholdRange    = $('#threshold-range');
const elThresholdValue    = $('#threshold-value');
const elAdminRulesList    = $('#admin-rules-list');
const elStatsGrid         = $('#stats-grid');

// 4단계: 배치 감사 DOM 참조
const elBatchInput        = $('#batch-input');
const elBatchCount        = $('#batch-count');
const elBtnBatchClear     = $('#btn-batch-clear');
const elBtnBatchRun       = $('#btn-batch-run');
const elBatchResults      = $('#batch-results');
const elBatchFooter       = $('#batch-footer');
const elBtnBatchCsv       = $('#btn-batch-csv');

// 4단계: Slack 버튼
const elBtnSlack          = $('#btn-slack');

// 5단계: 영문 제안 버튼 + DeepL 설정
const elBtnSuggestEn      = $('#btn-suggest-en');
const elDeeplKeyInput     = $('#deepl-key-input');
const elBtnDeeplSave      = $('#btn-deepl-save');
const elBtnDeeplTest      = $('#btn-deepl-test');
const elDeeplTestResult   = $('#deepl-test-result');

// 세션 위반 통계 (ruleId → 위반 횟수)
const sessionViolations   = {};
// 마지막 배치 감사 결과 (CSV 내보내기용)
let lastBatchResults      = [];

// ──────────────────────────────────────────────
// 탭 전환
// ──────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    if (!btn.dataset.tab) return; // data-tab 없는 버튼(⚙ 등)은 탭 핸들러 제외
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('tab--active', t === btn);
        t.setAttribute('aria-selected', t === btn ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-pane').forEach((pane) => {
        const isActive = pane.id === `tab-${target}`;
        pane.classList.toggle('tab-pane--active', isActive);
      });

      // 탭 전환 시 콘텐츠 갱신
      if (target === 'preview') renderPreview();
      if (target === 'html')    renderHtmlOutput();
      if (target === 'fix')     renderFixTab(state.lastResults);
      // batch 탭은 별도 조작 없음 (사용자 입력 기반)
    });
  });
}

// ──────────────────────────────────────────────
// 메타 필드 변경 핸들러
// ──────────────────────────────────────────────

function onMetaChange() {
  state.titleKo    = elTitleKo.value;
  state.titleEn    = elTitleEn.value;
  state.category   = elCategory.value;
  state.department = elDepartment.value;
  state.date       = elDate.value;
  triggerValidation();
}

/** 카테고리 변경 — 에디터가 비어 있으면 바로 템플릿 교체, 아니면 확인 필요 */
function onCategoryChange() {
  if (!editor.isEmpty()) {
    // P2 TODO: 확인 다이얼로그 추가 (현재는 즉시 교체)
    // 일단 바로 교체 (MVP)
  }
  const html = getTemplate(elCategory.value);
  editor.setHtml(html);
  state.bodyHtml  = editor.getHtml();
  state.bodyDelta = editor.getDelta();
  state.category = elCategory.value;
  onMetaChange();
}

// ──────────────────────────────────────────────
// 검증 & 준수율 배너
// ──────────────────────────────────────────────

function triggerValidation() {
  const data    = buildData();
  const results = checkAll(data, state.disabledRules);
  const score   = calcScore(results);

  state.lastResults = results;

  trackViolations(results);
  renderComplianceBanner(results, score);
  renderRulesList(results);

  // 자동수정 탭이 열려 있으면 갱신
  if ($('#tab-fix').classList.contains('tab-pane--active')) {
    renderFixTab(results);
  }

  // HTML 출력 탭이 열려 있으면 갱신
  if ($('#tab-html').classList.contains('tab-pane--active')) {
    renderHtmlOutput();
  }
}

function buildData() {
  return {
    titleKo:    state.titleKo,
    titleEn:    state.titleEn,
    category:   state.category,
    department: state.department,
    bodyHtml:   state.bodyHtml,
    bodyDelta:  state.bodyDelta,
  };
}

function renderComplianceBanner(results, score) {
  const passed  = results.filter((r) => r.passed).length;
  const total   = results.length;
  const pct     = Math.round(score * 100);

  elComplianceScore.textContent = `${passed} / ${total}`;
  elComplianceFill.style.width  = `${pct}%`;

  // 색상 클래스
  elComplianceFill.classList.remove('compliance-banner__fill--warn', 'compliance-banner__fill--pass');
  elComplianceScore.classList.remove(
    'compliance-banner__score--pass',
    'compliance-banner__score--warn',
    'compliance-banner__score--fail'
  );

  if (score >= 1.0) {
    elComplianceFill.classList.add('compliance-banner__fill--pass');
    elComplianceScore.classList.add('compliance-banner__score--pass');
  } else if (score >= 0.7) {
    elComplianceFill.classList.add('compliance-banner__fill--warn');
    elComplianceScore.classList.add('compliance-banner__score--warn');
  } else {
    elComplianceScore.classList.add('compliance-banner__score--fail');
  }

  // 복사 버튼 활성화 (Admin COPY_THRESHOLD 기준)
  elBtnCopy.disabled = score < getCopyThresholdSetting();
}

// ──────────────────────────────────────────────
// 규칙 목록 렌더링 (가이드라인 탭)
// ──────────────────────────────────────────────

function renderRulesList(results) {
  if (!results.length) {
    elRulesList.innerHTML = '<p class="rules-list__empty">제목 또는 본문을 입력하면 검증이 시작됩니다.</p>';
    return;
  }

  elRulesList.innerHTML = results.map((r) => {
    const statusClass = r.passed ? 'pass' : (r.message === 'ERROR' ? 'error' : 'fail');
    const badge       = r.passed ? '통과' : (r.message === 'ERROR' ? '오류' : '위반');
    const tooltipHtml = r.tooltip
      ? `<span class="rule-tooltip">❌ ${r.tooltip.bad}<br>✅ ${r.tooltip.good}</span>`
      : '';

    // 자동수정 버튼 — 위반 중 + fixable인 규칙에만
    const fixBtnHtml = (!r.passed && r.message !== 'ERROR' && FIXABLE_RULES.has(r.id))
      ? `<button class="btn btn--fix btn--sm" data-fix-id="${r.id}">자동수정</button>`
      : '';

    return `
      <div class="rule-card rule-card--${statusClass}">
        <div class="rule-card__header">
          <span class="rule-card__badge">${badge}</span>
          <span class="rule-card__name-wrap">
            <span class="rule-card__name">규칙 ${r.id}. ${r.name}</span>
            ${tooltipHtml}
          </span>
          ${fixBtnHtml}
        </div>
        <div class="rule-card__body">${r.message}</div>
      </div>
    `;
  }).join('');

  // 자동수정 버튼 클릭 이벤트 위임
  elRulesList.querySelectorAll('.btn--fix').forEach((btn) => {
    btn.addEventListener('click', () => applyFix(Number(btn.dataset.fixId)));
  });
}

// ──────────────────────────────────────────────
// 자동수정 탭 렌더링
// ──────────────────────────────────────────────

function renderFixTab(results) {
  const fixableFailures = results.filter(
    (r) => !r.passed && r.message !== 'ERROR' && FIXABLE_RULES.has(r.id)
  );

  elFixCount.textContent = fixableFailures.length;
  elBtnFixAll.disabled   = fixableFailures.length === 0;

  if (fixableFailures.length === 0) {
    elFixList.innerHTML = '<p class="fix-list__empty">자동수정이 필요한 규칙이 없습니다. ✅</p>';
    return;
  }

  const data = buildData();

  elFixList.innerHTML = fixableFailures.map((r) => {
    // fix 적용 후 데이터 계산 (미리보기용, 실제 적용은 버튼 클릭 시)
    let diffHtml = '';
    try {
      const fixed = fixRule(r.id, data);
      // titleKo 변경 여부
      if (fixed.titleKo !== data.titleKo) {
        diffHtml += `<div class="diff-row"><span class="diff-label">제목</span><div class="diff-content">${generateDiff(data.titleKo, fixed.titleKo, false)}</div></div>`;
      }
      // bodyHtml 변경 여부
      if (fixed.bodyHtml !== data.bodyHtml) {
        diffHtml += `<div class="diff-row"><span class="diff-label">본문</span><div class="diff-content">${generateDiff(data.bodyHtml, fixed.bodyHtml, true)}</div></div>`;
      }
      if (!diffHtml) {
        diffHtml = '<span class="diff-equal">변경 없음</span>';
      }
    } catch (err) {
      diffHtml = `<span class="diff-error">diff 계산 실패: ${err.message}</span>`;
    }

    return `
      <div class="fix-card" data-rule-id="${r.id}">
        <div class="fix-card__header">
          <span class="fix-card__name">규칙 ${r.id}. ${r.name}</span>
          <button class="btn btn--primary btn--sm btn--fix-single" data-fix-id="${r.id}">적용</button>
        </div>
        <div class="fix-card__message">${r.message}</div>
        <div class="fix-card__diff">${diffHtml}</div>
      </div>
    `;
  }).join('');

  // 개별 적용 버튼
  elFixList.querySelectorAll('.btn--fix-single').forEach((btn) => {
    btn.addEventListener('click', () => applyFix(Number(btn.dataset.fixId)));
  });
}

// ──────────────────────────────────────────────
// 자동수정 적용
// ──────────────────────────────────────────────

/** 단일 규칙 fix 적용 */
function applyFix(ruleId) {
  const data  = buildData();
  const fixed = fixRule(ruleId, data);

  // 상태 + 입력 필드 업데이트
  if (fixed.titleKo !== data.titleKo) {
    state.titleKo    = fixed.titleKo;
    elTitleKo.value  = fixed.titleKo;
  }
  if (fixed.titleEn !== data.titleEn) {
    state.titleEn    = fixed.titleEn;
    elTitleEn.value  = fixed.titleEn;
  }
  if (fixed.bodyHtml !== data.bodyHtml) {
    state.bodyHtml = fixed.bodyHtml;
    editor.setHtml(fixed.bodyHtml);
  }

  triggerValidation();
}

/** 모든 fixable 위반 규칙을 순서대로 적용 */
function applyAllFixes() {
  let data = buildData();
  const results = checkAll(data, state.disabledRules);

  const fixableIds = results
    .filter((r) => !r.passed && r.message !== 'ERROR' && FIXABLE_RULES.has(r.id))
    .map((r) => r.id);

  if (!fixableIds.length) return;

  // 순서대로 적용 (각 fix는 이전 fix 결과 위에 적용)
  for (const id of fixableIds) {
    data = fixRule(id, data);
  }

  // 최종 결과를 상태와 UI에 반영
  state.titleKo = data.titleKo;
  state.titleEn = data.titleEn;
  state.bodyHtml = data.bodyHtml;
  elTitleKo.value = data.titleKo;
  elTitleEn.value = data.titleEn;
  editor.setHtml(data.bodyHtml);

  triggerValidation();
}

// ──────────────────────────────────────────────
// 5단계: DeepL 테스트 결과 표시
// ──────────────────────────────────────────────

function showDeeplResult(msg, level) {
  if (!elDeeplTestResult) return;
  elDeeplTestResult.textContent = msg;
  elDeeplTestResult.className   = `deepl-test-result deepl-test-result--${level}`;
  elDeeplTestResult.hidden      = false;
  setTimeout(() => { elDeeplTestResult.hidden = true; }, 6000);
}

// ──────────────────────────────────────────────
// 4단계: Admin Panel
// ──────────────────────────────────────────────

function openAdminModal() {
  renderAdminPanel();
  elAdminModal.hidden = false;
}

function closeAdminModal() {
  elAdminModal.hidden = true;
}

function renderAdminPanel() {
  const settings = loadAdminSettings();

  // threshold 슬라이더
  const pct = Math.round(settings.copyThreshold * 100);
  elThresholdRange.value  = pct;
  elThresholdValue.textContent = `${pct}%`;

  // 규칙 목록
  const disabled = new Set(settings.disabledRules);
  elAdminRulesList.innerHTML = ALL_RULES.map((r) => {
    const isDisabled = disabled.has(r.id);
    return `
      <li class="admin-rule-item">
        <label class="admin-rule-toggle">
          <input type="checkbox" class="admin-rule-checkbox" data-rule-id="${r.id}"
            ${isDisabled ? '' : 'checked'} />
          <span class="admin-rule-name">규칙 ${r.id}. ${r.name}</span>
        </label>
      </li>
    `;
  }).join('');

  // 체크박스 이벤트
  elAdminRulesList.querySelectorAll('.admin-rule-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      const ruleId = Number(cb.dataset.ruleId);
      toggleRule(ruleId);
      // 비활성화된 규칙 = unchecked → disabledRules에 포함됨
      state.disabledRules = loadAdminSettings().disabledRules;
      triggerValidation();
    });
  });

  // DeepL Key 표시 (마스킹)
  if (elDeeplKeyInput) {
    elDeeplKeyInput.value = loadDeeplKey();
  }

  // 위반 통계
  renderStatsGrid();
}

function renderStatsGrid() {
  const entries = Object.entries(sessionViolations);
  if (!entries.length) {
    elStatsGrid.innerHTML = '<p class="stats-empty">아직 검증 기록이 없습니다.</p>';
    return;
  }
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  elStatsGrid.innerHTML = `
    <table class="stats-table">
      <thead><tr><th>규칙</th><th>위반 횟수</th></tr></thead>
      <tbody>
        ${sorted.map(([id, count]) => {
          const rule = ALL_RULES.find((r) => r.id === Number(id));
          return `<tr>
            <td>규칙 ${id}. ${rule?.name ?? ''}</td>
            <td class="stats-count">${count}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

/** 검증 결과에서 위반 횟수 집계 */
function trackViolations(results) {
  results.forEach((r) => {
    if (!r.passed && r.message !== 'ERROR') {
      sessionViolations[r.id] = (sessionViolations[r.id] ?? 0) + 1;
    }
  });
}

// ──────────────────────────────────────────────
// 4단계: 배치 감사
// ──────────────────────────────────────────────

function initBatchPanel() {
  // 입력 변경 → 공지 수 카운트
  elBatchInput?.addEventListener('input', () => {
    const notices = parseNotices(elBatchInput.value);
    elBatchCount.textContent = `${notices.length}개 공지 인식됨`;
    elBtnBatchRun.disabled = notices.length === 0;
  });

  // 초기화
  elBtnBatchClear?.addEventListener('click', () => {
    elBatchInput.value = '';
    elBatchCount.textContent = '0개 공지 인식됨';
    elBtnBatchRun.disabled = true;
    elBatchResults.innerHTML = '';
    elBatchFooter.hidden = true;
    lastBatchResults = [];
  });

  // 감사 실행
  elBtnBatchRun?.addEventListener('click', () => {
    const notices = parseNotices(elBatchInput.value);
    lastBatchResults = auditBatch(notices, state.disabledRules);
    renderBatchResults(lastBatchResults);
    elBatchFooter.hidden = lastBatchResults.length === 0;
  });

  // CSV 내보내기
  elBtnBatchCsv?.addEventListener('click', () => {
    exportCsv(lastBatchResults, state.disabledRules);
  });
}

function renderBatchResults(rows) {
  if (!rows.length) {
    elBatchResults.innerHTML = '<p class="batch-empty">결과가 없습니다.</p>';
    return;
  }

  const activeRules = ALL_RULES.filter((r) => !state.disabledRules.includes(r.id));

  const thRules = activeRules.map((r) =>
    `<th class="batch-th" title="${r.name}">R${r.id}</th>`).join('');

  const bodyRows = rows.map((row) => {
    const scoreClass = row.parseError ? 'batch-score--error'
      : row.score >= 100 ? 'batch-score--pass'
      : row.score >= 70  ? 'batch-score--warn'
      : 'batch-score--fail';

    const ruleCells = activeRules.map((r) => {
      if (row.parseError) return '<td class="batch-cell--error">?</td>';
      const passed = row.ruleMap[r.id];
      return passed === undefined
        ? '<td>-</td>'
        : `<td class="batch-cell--${passed ? 'pass' : 'fail'}">${passed ? '✓' : '✗'}</td>`;
    }).join('');

    return `
      <tr>
        <td class="batch-idx">${row.index}</td>
        <td class="batch-title" title="${row.titleKo}">${truncate(row.titleKo, 28)}</td>
        <td class="batch-score ${scoreClass}">${row.parseError ? '오류' : row.score + '%'}</td>
        ${ruleCells}
      </tr>
    `;
  }).join('');

  // 요약 행
  const avgScore = rows.reduce((s, r) => s + (r.parseError ? 0 : r.score), 0) / rows.length;
  const passCounts = activeRules.map((r) =>
    rows.filter((row) => !row.parseError && row.ruleMap[r.id] === true).length);
  const summaryRuleCells = passCounts.map((c) =>
    `<td class="batch-cell--summary">${c}/${rows.length}</td>`).join('');

  elBatchResults.innerHTML = `
    <div class="batch-summary">
      총 <b>${rows.length}</b>개 공지 · 평균 준수율 <b>${Math.round(avgScore)}%</b>
    </div>
    <div class="batch-table-wrap">
      <table class="batch-table">
        <thead>
          <tr>
            <th>#</th><th>제목</th><th>준수율</th>
            ${thRules}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="batch-foot-label">규칙별 통과 수</td>
            ${summaryRuleCells}
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ──────────────────────────────────────────────
// 4단계: Slack 요약 복사
// ──────────────────────────────────────────────

function buildSlackSummary() {
  const d = state;
  const dateStr = d.date ? d.date.replace(/-/g, '.') : '날짜 미입력';

  // 문의처 패턴 추출 (bodyHtml에서 "문의:" 행 찾기)
  const contactMatch = d.bodyHtml?.match(/문의[:\s：]+([^<\n]{5,60})/);
  const contact = contactMatch ? contactMatch[1].trim() : (d.department || '문의처 미입력');

  return [
    `📢 *${d.titleKo || '제목 미입력'}*`,
    `📅 ${dateStr}`,
    `📞 ${contact}`,
  ].join('\n');
}

// ──────────────────────────────────────────────
// 3단계: 자동저장 & 복원
// ──────────────────────────────────────────────

function buildEditorData() {
  return {
    category:   state.category,
    titleKo:    state.titleKo,
    titleEn:    state.titleEn,
    department: state.department,
    date:       state.date,
    bodyHtml:   state.bodyHtml,
  };
}

function restoreEditorData(data) {
  state.category   = data.category   ?? 'general';
  state.titleKo    = data.titleKo    ?? '';
  state.titleEn    = data.titleEn    ?? '';
  state.department = data.department ?? '';
  state.date       = data.date       ?? '';
  state.bodyHtml   = data.bodyHtml   ?? '';

  elCategory.value   = state.category;
  elTitleKo.value    = state.titleKo;
  elTitleEn.value    = state.titleEn;
  elDepartment.value = state.department;
  elDate.value       = state.date;
  editor.setHtml(state.bodyHtml);
  triggerValidation();
}

function startAutosave() {
  if (!isStorageAvailable()) return;
  autosaveTimer = setInterval(() => {
    saveAutosave(buildEditorData());
  }, AUTOSAVE_INTERVAL_MS);
}

function checkAutosaveOnInit() {
  if (!isStorageAvailable()) return;
  const saved = loadAutosave();
  if (!saved) return;

  const savedAt = new Date(saved.savedAt);
  const ago     = Math.round((Date.now() - savedAt) / 60000);
  elAutosaveMsg.textContent = `자동저장된 내용이 있습니다. (${ago}분 전)`;
  elAutosaveBanner.hidden = false;

  elBtnRestore.onclick = () => {
    restoreEditorData(saved);
    clearAutosave();
    elAutosaveBanner.hidden = true;
  };
  elBtnDiscard.onclick = () => {
    clearAutosave();
    elAutosaveBanner.hidden = true;
  };
}

// ──────────────────────────────────────────────
// 3단계: 저장 모달 (히스토리 + 템플릿)
// ──────────────────────────────────────────────

function openStorageModal() {
  renderHistoryList();
  renderTemplateList();
  elStorageModal.hidden = false;
}

function closeStorageModal() {
  elStorageModal.hidden = true;
}

/** 스토리지 탭 전환 */
function initStorageTabs() {
  document.querySelectorAll('.storage-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.stab;
      document.querySelectorAll('.storage-tab').forEach((t) =>
        t.classList.toggle('storage-tab--active', t === btn));
      document.querySelectorAll('.storage-pane').forEach((p) =>
        p.classList.toggle('storage-pane--active', p.id === `stab-${target}`));
      if (target === 'history')   renderHistoryList();
      if (target === 'templates') renderTemplateList();
    });
  });
}

/** 버전 히스토리 목록 렌더링 */
function renderHistoryList() {
  const history = loadHistory();
  if (!history.length) {
    elHistoryList.innerHTML = '<li class="storage-list__empty">저장된 버전이 없습니다.</li>';
    return;
  }
  elHistoryList.innerHTML = history.map((s) => `
    <li class="storage-list__item">
      <span class="storage-list__label">${s.label}</span>
      <span class="storage-list__date">${new Date(s.savedAt).toLocaleString('ko-KR')}</span>
      <div class="storage-list__actions">
        <button class="btn btn--sm btn--primary" data-restore-id="${s.id}">불러오기</button>
        <button class="btn btn--sm btn--danger"  data-delete-id="${s.id}">삭제</button>
      </div>
    </li>
  `).join('');

  elHistoryList.querySelectorAll('[data-restore-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const snap = loadHistory().find((s) => s.id === btn.dataset.restoreId);
      if (snap) { restoreEditorData(snap); closeStorageModal(); }
    });
  });
  elHistoryList.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteSnapshot(btn.dataset.deleteId);
      renderHistoryList();
    });
  });
}

/** 템플릿 목록 렌더링 */
function renderTemplateList() {
  const templates = loadTemplates();
  if (!templates.length) {
    elTemplateList.innerHTML = '<li class="storage-list__empty">저장된 템플릿이 없습니다.</li>';
    return;
  }
  elTemplateList.innerHTML = templates.map((t) => `
    <li class="storage-list__item">
      <span class="storage-list__label">${t.name}</span>
      <span class="storage-list__date">${new Date(t.savedAt).toLocaleString('ko-KR')}</span>
      <div class="storage-list__actions">
        <button class="btn btn--sm btn--primary" data-load-tpl="${t.id}">불러오기</button>
        <button class="btn btn--sm btn--danger"  data-del-tpl="${t.id}">삭제</button>
      </div>
    </li>
  `).join('');

  elTemplateList.querySelectorAll('[data-load-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tpl = loadTemplates().find((t) => t.id === btn.dataset.loadTpl);
      if (tpl) { restoreEditorData(tpl); closeStorageModal(); }
    });
  });
  elTemplateList.querySelectorAll('[data-del-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteTemplate(btn.dataset.delTpl);
      renderTemplateList();
    });
  });
}

/** 템플릿 이름 입력 프롬프트 (Promise 기반) */
function promptTemplateName(defaultName = '') {
  return new Promise((resolve) => {
    elTplNameInput.value = defaultName;
    elTplNameModal.hidden = false;
    elTplNameInput.focus();

    const confirm = () => {
      const name = elTplNameInput.value.trim();
      cleanup();
      resolve(name || null);
    };
    const cancel = () => { cleanup(); resolve(null); };
    const onKey  = (e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); };

    elTplNameConfirm.addEventListener('click', confirm, { once: true });
    elTplNameCancel.addEventListener('click', cancel, { once: true });
    elTplNameClose.addEventListener('click', cancel, { once: true });
    elTplNameInput.addEventListener('keydown', onKey);

    function cleanup() {
      elTplNameModal.hidden = true;
      elTplNameInput.removeEventListener('keydown', onKey);
      // { once: true } 리스너 중 아직 소비되지 않은 것을 명시적으로 제거
      elTplNameConfirm.removeEventListener('click', confirm);
      elTplNameCancel.removeEventListener('click', cancel);
      elTplNameClose.removeEventListener('click', cancel);
    }
  });
}

// ──────────────────────────────────────────────
// 미리보기 렌더링
// ──────────────────────────────────────────────

function renderPreview() {
  const data = buildData();
  elPreviewContainer.innerHTML = preview.render(data);
}

// ──────────────────────────────────────────────
// HTML 출력 렌더링
// ──────────────────────────────────────────────

function renderHtmlOutput() {
  const data = buildData();
  const html = htmlOut.generate(data);
  elHtmlCode.textContent = html;
}

// ──────────────────────────────────────────────
// 복사 버튼 핸들러
// ──────────────────────────────────────────────

async function onCopyHtml() {
  const data = buildData();
  const html = htmlOut.generate(data);
  await htmlOut.copyToClipboard(html, showClipboardFallback);
}

function showClipboardFallback(html) {
  elModalTextarea.value = html;
  elClipboardModal.hidden = false;
  elModalTextarea.select();
}

function closeModal() {
  elClipboardModal.hidden = true;
}

// ──────────────────────────────────────────────
// 키보드 단축키
// ──────────────────────────────────────────────

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+C — HTML 복사
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      if (!elBtnCopy.disabled) onCopyHtml();
    }
    // Ctrl+Shift+P — 미리보기 탭
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      document.querySelector('[data-tab="preview"]')?.click();
    }
    // Ctrl+Shift+A — 자동수정 탭
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      document.querySelector('[data-tab="fix"]')?.click();
    }
    // Ctrl+S — 스냅샷 저장
    if (e.ctrlKey && !e.shiftKey && e.key === 's') {
      e.preventDefault();
      saveSnapshot(buildEditorData());
      openStorageModal();
    }
    // ESC — 모달 닫기
    if (e.key === 'Escape') {
      closeModal();
      closeStorageModal();
      closeAdminModal();
    }
  });
}

// ──────────────────────────────────────────────
// 이벤트 리스너 등록
// ──────────────────────────────────────────────

function initEventListeners() {
  // 메타 필드
  elTitleKo.addEventListener('input',  onMetaChange);
  elTitleEn.addEventListener('input',  onMetaChange);
  elDepartment.addEventListener('input', onMetaChange);
  elDate.addEventListener('change',    onMetaChange);
  elCategory.addEventListener('change', onCategoryChange);

  // 에디터 변경 (editor.js에서 발행)
  document.addEventListener('editor:change', (e) => {
    state.bodyHtml  = e.detail.bodyHtml;
    state.bodyDelta = e.detail.bodyDelta;
    triggerValidation();
  });

  // 복사 버튼
  elBtnCopy.addEventListener('click', onCopyHtml);
  elBtnCopyHtml.addEventListener('click', onCopyHtml);

  // 모두 자동수정 버튼
  elBtnFixAll.addEventListener('click', applyAllFixes);

  // 모달 닫기
  elModalClose.addEventListener('click', closeModal);
  elClipboardModal.querySelector('.modal__backdrop')?.addEventListener('click', closeModal);

  // 모달 textarea 클릭 시 전체 선택
  elModalTextarea.addEventListener('click', () => elModalTextarea.select());

  // ── 4단계: Admin Panel 이벤트 ────────────────

  elBtnAdmin?.addEventListener('click', openAdminModal);
  elAdminModalClose?.addEventListener('click', closeAdminModal);
  elAdminModalBackdrop?.addEventListener('click', closeAdminModal);
  elBtnAdminClose?.addEventListener('click', closeAdminModal);

  // COPY_THRESHOLD 슬라이더
  elThresholdRange?.addEventListener('input', () => {
    const pct = Number(elThresholdRange.value);
    elThresholdValue.textContent = `${pct}%`;
    saveAdminSettings({ copyThreshold: pct / 100 });
    triggerValidation(); // 버튼 활성화 기준 즉시 갱신
  });

  // Admin 초기화
  elBtnAdminReset?.addEventListener('click', () => {
    if (!confirm('모든 Admin 설정을 초기화합니까?')) return;
    resetAdminSettings();
    state.disabledRules = [];
    renderAdminPanel();
    triggerValidation();
  });

  // Slack 요약 복사
  elBtnSlack?.addEventListener('click', async () => {
    const summary = buildSlackSummary();
    try {
      await navigator.clipboard.writeText(summary);
      elBtnSlack.textContent = '복사됨 ✓';
      setTimeout(() => { elBtnSlack.textContent = 'Slack 요약'; }, 2000);
    } catch {
      alert(summary); // 폴백
    }
  });

  // ── 5단계: 영문 제목 제안 ─────────────────────

  // 영문 제목 제안 버튼
  elBtnSuggestEn?.addEventListener('click', async () => {
    const korean = state.titleKo.trim();
    if (!korean) {
      elBtnSuggestEn.textContent = '제목 없음';
      setTimeout(() => { elBtnSuggestEn.textContent = '제안'; }, 2000);
      return;
    }

    elBtnSuggestEn.disabled = true;
    elBtnSuggestEn.textContent = '…';

    const { text, error } = await suggestEnglishTitle(korean);

    elBtnSuggestEn.disabled = false;
    elBtnSuggestEn.textContent = '제안';

    if (error) {
      elBtnSuggestEn.title = error;
      // 한번만 툴팁처럼 보여주기
      elBtnSuggestEn.textContent = '⚠ 실패';
      setTimeout(() => {
        elBtnSuggestEn.textContent = '제안';
        elBtnSuggestEn.title = 'DeepL로 영문 제목 자동 제안';
      }, 3000);
      return;
    }

    // 성공: 영문 제목 필드에 반영
    state.titleEn       = text;
    elTitleEn.value     = text;
    elBtnSuggestEn.textContent = '✓ 적용';
    setTimeout(() => { elBtnSuggestEn.textContent = '제안'; }, 2000);
    triggerValidation();
  });

  // DeepL API Key 저장
  elBtnDeeplSave?.addEventListener('click', () => {
    const key = elDeeplKeyInput?.value.trim() ?? '';
    saveDeeplKey(key);
    elBtnDeeplSave.textContent = '저장됨 ✓';
    setTimeout(() => { elBtnDeeplSave.textContent = '저장'; }, 2000);
  });

  // DeepL API Key 테스트
  elBtnDeeplTest?.addEventListener('click', async () => {
    const key = elDeeplKeyInput?.value.trim() ?? '';
    if (!key) {
      showDeeplResult('API Key를 먼저 입력하세요.', 'warn');
      return;
    }
    elBtnDeeplTest.disabled = true;
    elBtnDeeplTest.textContent = '테스트 중…';
    const { text, error } = await suggestEnglishTitle('박태준학술정보관', key);
    elBtnDeeplTest.disabled = false;
    elBtnDeeplTest.textContent = '테스트';
    if (error) {
      showDeeplResult(`실패: ${error}`, 'fail');
    } else {
      showDeeplResult(`성공: "${text}"`, 'pass');
    }
  });

  // ── 3단계: storage UI 이벤트 ──────────────────

  // 저장 버튼 — 스냅샷 저장 + 모달 열기
  elBtnSave?.addEventListener('click', () => {
    saveSnapshot(buildEditorData());
    openStorageModal();
  });

  // 저장 모달 닫기
  elStorageClose?.addEventListener('click', closeStorageModal);
  elStorageBackdrop?.addEventListener('click', closeStorageModal);

  // 스냅샷 바로 저장
  elBtnSnapshot?.addEventListener('click', () => {
    saveSnapshot(buildEditorData());
    renderHistoryList();
  });

  // 현재 내용을 템플릿으로 저장
  elBtnSaveTpl?.addEventListener('click', async () => {
    const name = await promptTemplateName(state.titleKo || '');
    if (!name) return;
    saveTemplate(name, buildEditorData());
    renderTemplateList();
  });

  // 템플릿 내보내기
  elBtnExportTpl?.addEventListener('click', exportTemplates);

  // 템플릿 가져오기
  elBtnImportTpl?.addEventListener('click', () => elImportFileInput?.click());
  elImportFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { added, skipped } = importTemplates(ev.target.result);
      renderTemplateList();
      alert(`가져오기 완료: ${added}개 추가, ${skipped}개 건너뜀`);
    };
    reader.readAsText(file);
    e.target.value = ''; // 같은 파일 재선택 허용
  });
}

// ──────────────────────────────────────────────
// 앱 초기화
// ──────────────────────────────────────────────

function init() {
  editor.init('#quill-editor');
  initTabs();
  initStorageTabs();
  initEventListeners();
  initKeyboardShortcuts();
  initBatchPanel();

  // 초기 날짜 오늘로
  const today = new Date().toISOString().split('T')[0];
  elDate.value = today;
  state.date   = today;

  // 자동저장 복원 확인 (초기 카테고리 템플릿 삽입 전에 확인)
  checkAutosaveOnInit();

  // 복원 배너가 없으면 초기 카테고리 템플릿 삽입
  if (elAutosaveBanner.hidden) {
    const initialHtml = getTemplate(state.category);
    editor.setHtml(initialHtml);
  }

  // 5분 자동저장 시작
  startAutosave();
}

// DOMContentLoaded 후 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
