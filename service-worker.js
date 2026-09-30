/* =========================================================
   MyRoutine PWA — Service Worker（離線快取）
   快取策略：
   - 安裝時預先快取核心檔案 + ECharts CDN
   - 導航（開啟網頁）→ 先網路後快取（確保線上取到最新版）
   - 其他靜態資源 → 先快取後網路（離線秒開，線上背景更新）
   ========================================================= */
const VERSION = 'v1.0.0';
const CACHE_NAME = 'myroutine-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js'
];

/* 安裝：預先下載並快取全部核心檔案 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* 啟動：清除舊版本快取，立即接管頁面 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* 請求攔截 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 只處理 GET
  if (request.method !== 'GET') return;

  // 導航請求（進入 App / 重新整理）：先網路、失敗回退快取
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功時同步更新快取中的首頁，下次離線也係最新版
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 靜態資源（含 ECharts CDN）：先快取、後網路，並在背景更新快取
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchAndUpdate = fetch(request)
        .then((response) => {
          // 僅快取成功回應（opaque 回應 status 為 0，已由安裝期預快取覆蓋）
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
//（注：内容由AI生成）
