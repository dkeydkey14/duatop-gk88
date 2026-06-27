/** Clone tab panes từ template vào mọi panel rules */
function mountTabPanes() {
  const tpl = document.getElementById("tpl-tab-panes");
  if (!tpl) return;
  document.querySelectorAll("[data-tab-body]").forEach((body) => {
    body.appendChild(tpl.content.cloneNode(true));
  });
}

function initTabs() {
  document.querySelectorAll(".tabs").forEach((tabs) => {
    const body = tabs.closest(".panel-rules")?.querySelector("[data-tab-body]");
    if (!body) return;

    tabs.querySelectorAll(".tab").forEach((tab, i) => {
      tab.addEventListener("click", () => {
        tabs.dataset.active = String(i);
        tabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
        body.querySelectorAll(".tab-pane").forEach((p) => {
          p.hidden = true;
          p.classList.remove("on");
        });
        const pane = body.querySelector(`[data-pane="${tab.dataset.tab}"]`);
        if (pane) {
          pane.hidden = false;
          pane.classList.add("on");
        }
      });
    });
  });
}

mountTabPanes();
initTabs();
