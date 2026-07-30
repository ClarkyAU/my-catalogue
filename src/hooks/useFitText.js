import { useEffect, useRef } from 'react';

// Smallest fraction of the CSS font size we will shrink to. Past this the text
// is left to wrap, so a pathologically long name still reads.
const MIN_SCALE = 0.5;
// Breathing room so the drop shadow never sits flush against the edge.
const GUTTER = 6;

const FONT_PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch',
  'fontVariant', 'letterSpacing', 'wordSpacing', 'textTransform',
];

// Width the text would take on a single line, measured in a throwaway probe so
// the real heading is never made unwrappable — an unwrappable heading would
// inflate the layout's minimum width and push the panes around.
const measureLine = (el) => {
  const computed = getComputedStyle(el);
  const probe = document.createElement('span');
  for (const prop of FONT_PROPS) probe.style[prop] = computed[prop];
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.style.visibility = 'hidden';
  probe.style.whiteSpace = 'pre';
  probe.textContent = el.textContent;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
};

/**
 * Keeps a heading on one line by scaling it down when the text is too long for
 * its container, exposing the result as a `--fit-scale` custom property that
 * the stylesheet multiplies the font size by. It only ever scales down, so
 * short headings keep the full-size treatment.
 */
export const useFitText = (text) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let lastWidth = 0;

    const fit = () => {
      // Measure against the unscaled size, then work out the scale from there,
      // so repeated fits do not compound.
      el.style.setProperty('--fit-scale', '1');
      const available = el.clientWidth - GUTTER;
      lastWidth = el.clientWidth;
      const natural = measureLine(el);
      if (available <= 0 || natural <= 0) return;

      const scale = Math.min(1, available / natural);
      el.style.setProperty('--fit-scale', scale < MIN_SCALE ? String(MIN_SCALE) : scale.toFixed(3));
    };

    fit();
    // Webfont metrics differ from the fallback face, so measure again once the
    // real one has landed.
    document.fonts?.ready.then(fit).catch(() => {});

    if (typeof ResizeObserver === 'undefined') return undefined;
    // Refit only when the space available actually changes — reacting to the
    // height change our own font size caused would loop.
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return ref;
};
