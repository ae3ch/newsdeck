// Sets the color scheme before the first render, so nothing flashes.
(function () {
  var dark = matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    var c = JSON.parse(localStorage.getItem('tech-news:config') || '{}');
    var t = (c.settings && c.settings.theme) || 'system';
    if (t !== 'system') dark = t === 'dark';
  } catch (e) {
    // without readable storage the system setting applies
  }
  if (!dark) return;
  document.documentElement.classList.add('dark');
  // Color of the browser and status bar; the light counterpart is in index.html.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#0c0d0f');
})();
