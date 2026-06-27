const config = window.APP_CONFIG || {};
const API_BASE = config.apiBase || "";
const LIMIT = config.leaderboardLimit || 100;
const REFRESH = config.refreshIntervalMs || 60_000;
const MEDALS = ["img/medal-1.png", "img/medal-2.png", "img/medal-3.png"];

function $(id) {
  return document.getElementById(id);
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString("vi-VN");
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderRankCard(data) {
  const beat = Math.min(Math.max(Number(data.beatPercent) || 0, 0), 100);
  const beatHtml =
    data.beatPercent != null
      ? `
    <div class="rank-beat">
      <div class="rank-beat-bar">
        <div class="rank-beat-fill" style="width:${beat}%"></div>
      </div>
      <p class="rank-beat-text">
        Vượt <strong>${beat}%</strong> TRONG TẤT CẢ THÀNH VIÊN
      </p>
    </div>`
      : "";

  return `
    <div class="rank-card">
      <div class="rank-card-account">${esc(data.account)}</div>
      <div class="rank-stats">
        <div class="rank-stat">
          <span class="rank-stat-label">Thứ hạng</span>
          <span class="rank-stat-value highlight">#${fmt(data.rank)}</span>
        </div>
        <div class="rank-stat">
          <span class="rank-stat-label">Tổng nạp</span>
          <span class="rank-stat-value">${fmt(data.onlineDepositTotal)}</span>
        </div>
      </div>
      ${beatHtml}
    </div>`;
}

function buildRowsHtml(rows) {
  return rows
    .map((r) => {
      const top3 = r.rank <= 3;
      const rank = top3
        ? `<img src="${MEDALS[r.rank - 1]}" alt="${r.rank}" width="40" height="40" />`
        : `<span>${r.rank}</span>`;
      return `
        <div class="lb-row${top3 ? " top3" : ""}">
          <div class="rank">${rank}</div>
          <div class="account">${esc(r.account)}</div>
          <div class="points">${fmt(r.onlineDepositTotal)}</div>
        </div>`;
    })
    .join("");
}

const SCROLL_SPEED = 28;
const USER_PAUSE_MS = 4000;
const scrollControllers = new WeakMap();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastBoardRows = null;

function isLbVisible(el) {
  return el.getClientRects().length > 0 && el.clientHeight > 0;
}

function stopAutoScroll(el) {
  const ctrl = scrollControllers.get(el);
  if (!ctrl) return;

  if (ctrl.resumeTimer) clearTimeout(ctrl.resumeTimer);
  el.removeEventListener("wheel", ctrl.onInteract);
  el.removeEventListener("touchstart", ctrl.onInteract);
  el.removeEventListener("touchmove", ctrl.onInteract);
  el.removeEventListener("pointerdown", ctrl.onInteract);
  scrollControllers.delete(el);
  el.classList.remove("lb-auto-scroll", "lb-user-scroll");
  el.style.removeProperty("--scroll-duration");
  el.querySelector(".lb-scroll-track")?.style.removeProperty("animation-play-state");
}

function startAutoScroll(el, track) {
  stopAutoScroll(el);

  const loopAt = track.offsetHeight / 2;
  if (loopAt <= el.clientHeight) return;

  el.classList.add("lb-auto-scroll");
  el.style.setProperty("--scroll-duration", `${loopAt / SCROLL_SPEED}s`);

  const onInteract = () => {
    el.classList.add("lb-user-scroll");
    const trackEl = el.querySelector(".lb-scroll-track");
    if (trackEl) trackEl.style.animationPlayState = "paused";

    if (ctrl.resumeTimer) clearTimeout(ctrl.resumeTimer);
    ctrl.resumeTimer = setTimeout(() => {
      el.classList.remove("lb-user-scroll");
      el.scrollTop = 0;
      if (trackEl) trackEl.style.animationPlayState = "running";
    }, USER_PAUSE_MS);
  };

  const ctrl = { onInteract, resumeTimer: 0 };
  scrollControllers.set(el, ctrl);

  el.addEventListener("wheel", onInteract, { passive: true });
  el.addEventListener("touchstart", onInteract, { passive: true });
  el.addEventListener("touchmove", onInteract, { passive: true });
  el.addEventListener("pointerdown", onInteract, { passive: true });
}

function mountScrollTrack(el, rowsHtml) {
  el.innerHTML = `<div class="lb-scroll-track">${rowsHtml}${rowsHtml}</div>`;
  return el.querySelector(".lb-scroll-track");
}

function setupAutoScroll(el, rowsHtml) {
  stopAutoScroll(el);

  if (prefersReducedMotion.matches) {
    el.innerHTML = rowsHtml;
    return;
  }

  const track = mountScrollTrack(el, rowsHtml);
  const imgs = track.querySelectorAll("img");
  let started = false;

  const tryStart = () => {
    if (started) return;
    started = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isLbVisible(el)) return;

        if (track.offsetHeight / 2 <= el.clientHeight) {
          el.innerHTML = rowsHtml;
          return;
        }

        startAutoScroll(el, track);
      });
    });
  };

  if (!imgs.length) {
    tryStart();
    return;
  }

  let pending = imgs.length;
  const done = () => {
    pending -= 1;
    if (pending === 0) tryStart();
  };

  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  });
}

function renderRows(rows) {
  lastBoardRows = rows;

  if (!rows.length) {
    document.querySelectorAll(".lb-tbody").forEach((el) => {
      stopAutoScroll(el);
      el.innerHTML = '<div class="lb-state">Chưa có dữ liệu.</div>';
    });
    return;
  }

  const rowsHtml = buildRowsHtml(rows);
  document.querySelectorAll(".lb-tbody").forEach((el) => {
    setupAutoScroll(el, rowsHtml);
  });
}

function refreshAutoScroll() {
  if (lastBoardRows) renderRows(lastBoardRows);
}

async function loadBoard() {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard/top?limit=${LIMIT}`);
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    renderRows(data.rows || []);
  } catch {
    const err = '<div class="lb-state err">Không tải được BXH. Kiểm tra API.</div>';
    document.querySelectorAll(".lb-tbody").forEach((el) => {
      stopAutoScroll(el);
      el.innerHTML = err;
    });
  }
}

function initModal() {
  const modal = $("rank-modal");
  const input = $("rank-input");
  const result = $("rank-result");

  const clearResult = () => {
    result.textContent = "";
    result.className = "modal-result";
    result.innerHTML = "";
  };

  const open = () => {
    modal.classList.remove("hidden");
    input.value = "";
    clearResult();
    input.focus();
  };

  const close = () => modal.classList.add("hidden");

  document.querySelectorAll(".btn-check-rank").forEach((btn) => {
    btn.addEventListener("click", open);
  });
  $("modal-close").addEventListener("click", close);
  $("modal-cancel").addEventListener("click", close);
  $("modal-backdrop").addEventListener("click", close);

  $("modal-submit").addEventListener("click", async () => {
    const account = input.value.trim();
    if (!account) {
      result.textContent = "Vui lòng nhập tài khoản.";
      result.className = "modal-result err";
      return;
    }
    result.textContent = "Đang tra cứu...";
    result.className = "modal-result loading";
    try {
      const res = await fetch(
        `${API_BASE}/api/leaderboard/rank/${encodeURIComponent(account)}`
      );
      const data = await res.json();
      if (!data.found) {
        result.textContent = `Không tìm thấy tài khoản "${account}".`;
        result.className = "modal-result err";
        return;
      }
      result.innerHTML = renderRankCard(data);
      result.className = "modal-result ok";
    } catch {
      result.textContent = "Không tra cứu được. Thử lại sau.";
      result.className = "modal-result err";
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("modal-submit").click();
    if (e.key === "Escape") close();
  });
}

initModal();
loadBoard();
setInterval(loadBoard, REFRESH);

let resizeScrollTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeScrollTimer);
  resizeScrollTimer = setTimeout(refreshAutoScroll, 120);
});
window.addEventListener("viewport-fit", () => {
  clearTimeout(resizeScrollTimer);
  resizeScrollTimer = setTimeout(refreshAutoScroll, 120);
});
