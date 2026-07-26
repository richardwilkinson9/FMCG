(function () {
  var W = 1920, H = 1080;
  var stage = document.getElementById('stage');
  var desktop = window.matchMedia('(min-width: 900px)');

  /* ---- mobile: borrow the competitor plot from the desktop slide ----------
     Same markup, same data — cloned rather than duplicated so the chart can
     never drift from the one on the big screen. It sits at its native 1000px
     inside a horizontal scroller, so the labels stay legible and the reader
     pans instead of squinting. */
  function buildPlot() {
    var host = document.getElementById('m-plot');
    var srcPlot = document.getElementById('deskPlot');
    if (!host || !srcPlot || host.childNodes.length) return;
    var clone = srcPlot.cloneNode(true);
    clone.removeAttribute('id');
    clone.className = 'm-plot';
    // Drop the desktop slide's absolute offsets; .m-plot in the stylesheet
    // owns the mobile geometry (native 1000x700, scaled to 0.8).
    clone.setAttribute('style', '');
    host.appendChild(clone);
    // ZERO+ sits at the far right of the plot — the whole point of the slide.
    // Start there and let the reader pan left through the compromise zone.
    var sc = document.getElementById('m-scroller');
    if (sc) sc.scrollLeft = sc.scrollWidth;
  }

  /* ---- desktop: fit a whole slide on screen ----------------------------- */
  function fit() {
    if (!desktop.matches) {
      stage.style.transform = '';
      document.body.style.height = '';
      return;
    }
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var s = Math.min(vw / W, vh / H);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.max(0, (vw - W * s) / 2) + 'px';
    document.body.style.height = (stage.querySelectorAll('section').length * H * s) + 'px';
    document.documentElement.style.setProperty('--slide-h', (H * s) + 'px');
  }

  function slideHeight() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slide-h')) || 0;
  }

  function go(i) {
    var n = stage.querySelectorAll('section').length;
    var h = slideHeight();
    if (!h) return;
    i = Math.max(0, Math.min(n - 1, i));
    window.scrollTo({ top: i * h, behavior: 'smooth' });
  }

  document.addEventListener('keydown', function (e) {
    if (!desktop.matches || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var h = slideHeight();
    var at = h ? Math.round(window.scrollY / h) : 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); go(at + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault(); go(at - 1);
    } else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(stage.querySelectorAll('section').length - 1); }
  });

  function sync() { fit(); if (!desktop.matches) buildPlot(); }

  if (desktop.addEventListener) desktop.addEventListener('change', sync);
  else if (desktop.addListener) desktop.addListener(sync);
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', sync);
  window.addEventListener('load', sync);
  sync();
})();
