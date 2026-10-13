/* Admin-configured, per-account watermark. Disabled unless explicitly enabled for this user. */
(function () {
  'use strict';
  const token = () => localStorage.getItem('token');
  function ensureLayer(text) {
    let layer = document.getElementById('siteDemoWatermark');
    if (!layer) {
      const style = document.createElement('style');
      style.id = 'siteDemoWatermarkStyle';
      style.textContent = `#siteDemoWatermark{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:none;overflow:hidden;user-select:none;-webkit-user-select:none;background:repeating-linear-gradient(-35deg,transparent 0 115px,rgba(185,28,28,.035) 116px 165px)}#siteDemoWatermark .watermark-pattern{position:absolute;inset:-30%;display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));grid-auto-rows:minmax(130px,1fr);align-items:center;justify-items:center;transform:rotate(-28deg);gap:10px;padding:8%;box-sizing:border-box;width:160%;height:160%}#siteDemoWatermark .watermark-pattern span{font:1000 clamp(18px,3vw,46px)/1.5 system-ui,sans-serif;letter-spacing:2px;text-align:center;overflow-wrap:anywhere;color:rgba(185,28,28,.22);text-shadow:0 1px 1px rgba(255,255,255,.5);max-width:100%}body.site-demo-watermark-active #siteDemoWatermark{display:block}`;
      document.head.appendChild(style);
      layer = document.createElement('div'); layer.id = 'siteDemoWatermark'; layer.setAttribute('aria-hidden','true');
      document.body.appendChild(layer);
    }
    const pattern = document.createElement('div'); pattern.className = 'watermark-pattern';
    const label = String(text || '').trim().slice(0,160);
    for (let i=0;i<15;i++) { const span=document.createElement('span'); span.textContent=label; pattern.appendChild(span); }
    layer.replaceChildren(pattern);
  }
  async function refresh() {
    const t = token();
    if (!t || !document.body) return;
    try {
      const response = await fetch('/api/subscription/status?_=' + Date.now(), {cache:'no-store', headers:{Authorization:'Bearer '+t}});
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;
      const sub = data.subscription || {};
      // Only show on the specific account selected by the admin. No automatic watermark for other users.
      const enabled = sub.watermarkEnabled === true && String(sub.watermarkText || '').trim().length > 0;
      if (enabled) {
        ensureLayer(sub.watermarkText);
        document.body.classList.add('site-demo-watermark-active');
      } else {
        document.body.classList.remove('site-demo-watermark-active');
        document.getElementById('siteDemoWatermark')?.remove();
      }
    } catch (_) { /* Do not block app usage if status is temporarily unavailable. */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, {once:true}); else refresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.refreshSiteDemoWatermark = refresh;
})();
