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

  let scale = window.innerWidth / designW;
  if (capAtOne) scale = Math.min(scale, 1);

  const scaledW = designW * scale;
  const scaledH = designH * scale;

  scaler.style.width = `${scaledW}px`;
  scaler.style.height = `${scaledH}px`;
  viewport.style.height = `${scaledH}px`;

  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = "top left";
}

function fitAll() {
  const isMobile = window.innerWidth <= BREAKPOINT;
  document.body.dataset.view = isMobile ? "mb" : "pc";

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
