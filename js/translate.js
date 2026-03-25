/**
 * translate.js — DeepL 영문 제목 자동 제안
 *
 * - 온라인: DeepL Free API (api-free.deepl.com) 호출
 * - 오프라인 / API Key 없음 / 실패: '' 반환 + 이유 반환
 *
 * API Key는 localStorage 'notice-maker:deepl-key' 에 저장
 */

const DEEPL_URL   = 'https://api-free.deepl.com/v2/translate';
const KEY_STORAGE = 'notice-maker:deepl-key';
const TIMEOUT_MS  = 7000;

// ──────────────────────────────────────────────
// API Key 관리
// ──────────────────────────────────────────────

export function loadDeeplKey() {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; }
  catch { return ''; }
}

export function saveDeeplKey(key) {
  try { localStorage.setItem(KEY_STORAGE, key.trim()); }
  catch { /* noop */ }
}

// ──────────────────────────────────────────────
// 번역 요청
// ──────────────────────────────────────────────

/**
 * @param {string} korean — 번역할 한국어 제목
 * @param {string} apiKey — DeepL API Key (없으면 저장된 키 사용)
 * @returns {Promise<{ text: string, error: string|null }>}
 */
export async function suggestEnglishTitle(korean, apiKey) {
  const key = (apiKey ?? loadDeeplKey()).trim();

  if (!korean?.trim()) {
    return { text: '', error: '한국어 제목을 먼저 입력하세요.' };
  }

  if (!navigator.onLine) {
    return { text: '', error: '오프라인 상태입니다. 인터넷 연결 후 다시 시도하세요.' };
  }

  if (!key) {
    return { text: '', error: 'DeepL API Key가 설정되지 않았습니다. Admin 설정에서 입력하세요.' };
  }

  try {
    const body = new URLSearchParams({
      text:        korean,
      source_lang: 'KO',
      target_lang: 'EN-US',
      formality:   'more',        // 공식 문서 어조
    });

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(DEEPL_URL, {
      method:  'POST',
      headers: {
        Authorization:  `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:   body.toString(),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.status === 403) {
      return { text: '', error: 'API Key가 올바르지 않습니다 (403). Admin 설정에서 확인하세요.' };
    }
    if (res.status === 456) {
      return { text: '', error: 'DeepL 무료 할당량을 초과했습니다 (456).' };
    }
    if (!res.ok) {
      return { text: '', error: `DeepL 응답 오류: HTTP ${res.status}` };
    }

    const json = await res.json();
    const translated = json?.translations?.[0]?.text ?? '';

    if (!translated) {
      return { text: '', error: 'DeepL 응답에서 번역 결과를 찾을 수 없습니다.' };
    }

    return { text: translated, error: null };

  } catch (err) {
    if (err.name === 'AbortError') {
      return { text: '', error: `요청 시간 초과 (${TIMEOUT_MS / 1000}초). 네트워크를 확인하세요.` };
    }
    return { text: '', error: `번역 요청 실패: ${err.message}` };
  }
}
