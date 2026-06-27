const PC_W = 1920;
const PC_H = 1200;
const MB_W = 360;
const MB_H = 1384;
const BREAKPOINT = 768;

function fitOne(scalerId, canvasId, designW, designH, { capAtOne = false } = {}) {
  const scaler = document.getElementById(scalerId);
  const canvas = document.getElementById(canvasId);
  const viewport = scaler?.parentElement;
  if (!scaler || !canvas || !viewport) return;

  const viewW = window.innerWidth;
  let scale = viewW / designW;
  if (capAtOne) scale = Math.min(scale, 1);

  const scaledW = Math.min(designW * scale, viewW);
  const scaledH = designH * scale;

  viewport.style.width = "100%";
  viewport.style.maxWidth = "100%";
  viewport.style.overflow = "hidden";
  scaler.style.width = `${scaledW}px`;
  scaler.style.maxWidth = "100%";
  scaler.style.height = `${scaledH}px`;
  scaler.style.overflow = "hidden";
  viewport.style.height = `${scaledH}px`;

  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = "top left";
}

let lastFitWidth = 0;
let lastFitView = "";

function fitAll() {
  const isMobile = window.innerWidth <= BREAKPOINT;
  const view = isMobile ? "mb" : "pc";
  const viewW = window.innerWidth;

  if (viewW === lastFitWidth && view === lastFitView) return;
  lastFitWidth = viewW;
  lastFitView = view;

  document.body.dataset.view = view;

  if (isMobile) {
    fitOne("scaler-mb", "canvas-mb", MB_W, MB_H);
  } else {
    fitOne("scaler-pc", "canvas-pc", PC_W, PC_H, { capAtOne: true });
  }

  window.dispatchEvent(new Event("viewport-fit"));
}

fitAll();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitAll, 50);
});
