/**
 * Safe LocalStorage Utility
 * Chống lỗi "QuotaExceededError: The quota has been exceeded" trên các trình duyệt di động
 * (iOS Safari, Zalo in-app browser, Messenger in-app browser, Chrome Mobile)
 */

const OBSOLETE_KEYS_PREFIXES = [
  'mdlab_tests_v1', 'mdlab_tests_v2', 'mdlab_tests_v3', 'mdlab_tests_v4', 'mdlab_tests_v5', 'mdlab_tests_v6',
  'mdlab_results_v1', 'mdlab_results_v2', 'mdlab_results_v3', 'mdlab_results_v4', 'mdlab_results_v5', 'mdlab_results_v6',
  'mdlab_capas_v1', 'mdlab_capas_v2', 'mdlab_capas_v3', 'mdlab_capas_v4', 'mdlab_capas_v5', 'mdlab_capas_v6'
];

/**
 * Dọn dẹp các khóa lưu trữ phiên bản cũ để giải phóng dung lượng bộ nhớ
 */
export function purgeObsoleteStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // 1. Xóa các khóa phiên bản cũ đã biết
    OBSOLETE_KEYS_PREFIXES.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });

    // 2. Quét toàn bộ localStorage để dọn bất kỳ khóa tạm/trùng nào
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('mdlab_tests_v') || k.startsWith('mdlab_results_v') || k.startsWith('mdlab_capas_v'))) {
        if (!k.endsWith('_v7')) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (e) {
    console.warn('[SafeStorage] Không thể quét dọn localStorage:', e);
  }
}

/**
 * Ghi dữ liệu an toàn vào localStorage, tự động xử lý khi bộ nhớ đầy (Quota Exceeded)
 * ĐẢM BẢO KHÔNG BAO GIỜ THROW EXCEPTION LÀM SẬP GIAO DIỆN REACT
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (firstErr: any) {
    console.warn(`[SafeStorage] Lỗi tràn bộ nhớ khi lưu "${key}". Đang tự động dọn dẹp cache...`, firstErr);
    
    // Bước 1: Dọn dẹp toàn bộ dữ liệu phiên bản cũ
    purgeObsoleteStorage();

    // Bước 2: Thử ghi lại lần 2
    try {
      localStorage.setItem(key, value);
      console.info(`[SafeStorage] Đã lưu thành công "${key}" sau khi dọn dẹp cache.`);
      return true;
    } catch (secondErr: any) {
      console.warn(`[SafeStorage] Không đủ dung lượng để lưu "${key}". Tiếp tục chạy trên RAM mà không làm sập ứng dụng.`, secondErr);
      return false; // Tuyệt đối không re-throw lỗi, giúp ứng dụng vẫn chạy mượt mà trên bộ nhớ RAM
    }
  }
}

/**
 * Đọc dữ liệu an toàn từ localStorage
 */
export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (err) {
    console.warn(`[SafeStorage] Lỗi khi đọc "${key}":`, err);
    return fallback;
  }
}

/**
 * Xóa một mục khỏi localStorage an toàn
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}
