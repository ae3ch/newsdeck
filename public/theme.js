// Setzt das Farbschema vor dem ersten Rendern, damit nichts aufblitzt.
(function () {
  var dark = matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    var c = JSON.parse(localStorage.getItem('tech-news:config') || '{}');
    var t = (c.settings && c.settings.theme) || 'system';
    if (t !== 'system') dark = t === 'dark';
  } catch (e) {
    // ohne lesbaren Speicher gilt die Systemeinstellung
  }
  if (!dark) return;
  document.documentElement.classList.add('dark');
  // Farbe der Browser- und Statusleiste; das helle Gegenstück steht in index.html.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#0e0f11');
})();
