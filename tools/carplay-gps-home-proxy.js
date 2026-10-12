export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/__gpssearch") {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 180);
      if (q.length < 2) return Response.json({ results: [] });
      try {
        const g = new URL("https://data.geopf.fr/geocodage/search");
        g.searchParams.set("q", q);
        g.searchParams.set("limit", "7");
        const r = await fetch(g, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error("geocode");
        const j = await r.json();
        return Response.json({
          results: (j.features || []).map(f => ({
            name: f.properties?.label || "",
            lat: f.geometry?.coordinates?.[1],
            lon: f.geometry?.coordinates?.[0]
          })).filter(x => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lon))
        }, { headers: { "cache-control": "no-store" } });
      } catch {
        return Response.json({ results: [], error: "SEARCH_UNAVAILABLE" }, { status: 503 });
      }
    }

    const headers = new Headers(request.headers);
    headers.set("Cloudflare-Workers-Version-Overrides", 'carplay-telephone="bc9afb30-493b-4eb7-b405-1757093b364c"');
    const response = await env.CORE.fetch(new Request(request, { headers }));

    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") || (url.pathname !== "/" && url.pathname !== "/index.html")) return response;

    const inject = `
<style id="gpsHomeSafeCss">
#gpsHomeSafeModal{display:none;position:fixed;inset:0;z-index:2147483647;background:rgba(2,8,15,.95);padding:calc(env(safe-area-inset-top) + 24px) 14px 24px;overflow:auto;font-family:Arial,sans-serif}
#gpsHomeSafeModal.open{display:block}
#gpsHomeSafeCard{max-width:680px;margin:0 auto;background:#071321;border:3px solid #16aaff;border-radius:28px;padding:20px;color:#fff;box-shadow:0 18px 70px rgba(0,0,0,.7)}
#gpsHomeSafeClose{float:right;width:48px;height:48px;border:0;border-radius:15px;background:#25384c;color:#fff;font-size:28px;font-weight:900}
#gpsHomeSafeTitle{font-size:30px;font-weight:1000;margin:5px 56px 18px 0}
#gpsHomeSafeInput{width:100%;min-height:76px;border:4px solid #16aaff;border-radius:18px;background:#fff;color:#071321;padding:14px 16px;font-size:25px;font-weight:900;outline:none}
#gpsHomeSafeResults{display:grid;gap:8px;margin-top:10px}
#gpsHomeSafeResults button{width:100%;min-height:58px;border:0;border-radius:14px;background:#17304d;color:#fff;padding:13px 15px;text-align:left;font-size:18px;font-weight:900}
#gpsHomeSafeChosen{min-height:28px;margin-top:12px;color:#dcecff;font-size:17px;font-weight:850}
#gpsHomeSafeGo{display:none;width:100%;min-height:72px;margin-top:14px;border:0;border-radius:18px;background:linear-gradient(180deg,#25c8ff,#0877e7);color:#fff;font-size:22px;font-weight:1000;box-shadow:0 8px 20px rgba(0,140,255,.35)}
#homeAddressBookBtn{background:linear-gradient(180deg,#0b89ef,#064fa8)!important;border:3px solid #35c9ff!important}
#homeAddressBookBtn .addressButtonFull{display:none!important}
#homeAddressBookBtn .gpsHomeSafeVisual{display:flex!important;align-items:center;justify-content:center;gap:12px;width:100%;height:100%;min-height:120px;padding:8px}
.gpsHomeSafeIcon{width:78px;height:78px;filter:drop-shadow(0 7px 10px rgba(0,30,70,.65))}
.gpsHomeSafeText{font-size:31px;font-weight:1000;color:#fff;text-shadow:0 2px 4px #003}
.gpsHomeSafeArrow{font-size:35px;font-weight:1000;color:#e8fbff}
</style>
<div id="gpsHomeSafeModal">
 <div id="gpsHomeSafeCard">
  <button id="gpsHomeSafeClose" type="button">×</button>
  <div id="gpsHomeSafeTitle">GPS — Où voulez-vous aller ?</div>
  <input id="gpsHomeSafeInput" autocomplete="off" inputmode="search" placeholder="Entrer une adresse ou une ville">
  <div id="gpsHomeSafeResults"></div>
  <div id="gpsHomeSafeChosen"></div>
  <button id="gpsHomeSafeGo" type="button">ALLER À L’ADRESSE</button>
 </div>
</div>
<script id="gpsHomeSafeJs">
(()=> {
  if (window.__gpsHomeSafe) return;
  window.__gpsHomeSafe = 1;

  const icon = '<svg class="gpsHomeSafeIcon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#29d7ff"/><stop offset="1" stop-color="#0755d9"/></linearGradient><radialGradient id="gg"><stop stop-color="#b4ff82"/><stop offset="1" stop-color="#1ea84e"/></radialGradient><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff6658"/><stop offset="1" stop-color="#d40013"/></linearGradient></defs><circle cx="50" cy="50" r="47" fill="url(#gb)" stroke="#a9f5ff" stroke-width="3"/><circle cx="50" cy="50" r="39" fill="url(#gg)" stroke="#fff" stroke-width="2"/><path d="M12 63 C28 48 44 69 60 54 S82 42 92 29" fill="none" stroke="#f4f8ff" stroke-width="7"/><path d="M18 77 C34 63 48 75 63 65 S82 58 91 62" fill="none" stroke="#174d9e" stroke-width="9"/><path d="M18 77 C34 63 48 75 63 65 S82 58 91 62" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/><path d="M50 18c-12 0-22 9-22 21 0 16 22 38 22 38s22-22 22-38c0-12-10-21-22-21z" fill="url(#gr)" stroke="#fff" stroke-width="2"/><circle cx="50" cy="39" r="8" fill="#fff"/></svg>';

  function paintButton() {
    const b = document.getElementById("homeAddressBookBtn");
    if (!b || b.dataset.gpsReady === "1") return;
    b.dataset.gpsReady = "1";
    b.setAttribute("aria-label", "GPS");
    b.innerHTML = '<div class="gpsHomeSafeVisual">' + icon + '<span class="gpsHomeSafeText">GPS</span><span class="gpsHomeSafeArrow">›</span></div>';
  }

  let chosen = null, timer = 0;
  const modal = document.getElementById("gpsHomeSafeModal");
  const input = document.getElementById("gpsHomeSafeInput");
  const results = document.getElementById("gpsHomeSafeResults");
  const selected = document.getElementById("gpsHomeSafeChosen");
  const go = document.getElementById("gpsHomeSafeGo");

  function openGps(e) {
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
    chosen = null;
    input.value = "";
    results.innerHTML = "";
    selected.textContent = "";
    go.style.display = "none";
    modal.classList.add("open");
    setTimeout(() => input.focus(), 80);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#homeAddressBookBtn");
    if (b) openGps(e);
  }, true);

  document.getElementById("gpsHomeSafeClose").onclick = () => modal.classList.remove("open");

  input.addEventListener("input", () => {
    chosen = null;
    selected.textContent = "";
    go.style.display = "none";
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      try {
        const r = await fetch("/__gpssearch?q=" + encodeURIComponent(q), { cache: "no-store" });
        const j = await r.json();
        results.innerHTML = "";
        (j.results || []).slice(0, 7).forEach(item => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = item.name;
          b.onclick = () => {
            chosen = item;
            input.value = item.name;
            results.innerHTML = "";
            selected.textContent = "Destination : " + item.name;
            go.style.display = "block";
          };
          results.appendChild(b);
        });
      } catch {
        results.innerHTML = "";
      }
    }, 160);
  });

  go.onclick = () => {
    if (!chosen) return;
    const q = new URLSearchParams({
      destination: chosen.lat + "," + chosen.lon,
      name: chosen.name
    });
    location.assign("/gps?" + q.toString());
  };

  const obs = new MutationObserver(paintButton);
  obs.observe(document.documentElement, { subtree: true, childList: true });
  paintButton();
})();
</script>`;

    const h = new Headers(response.headers);
    h.delete("content-length");
    h.delete("etag");
    h.set("cache-control", "no-store");
    return new HTMLRewriter()
      .on("body", { element(el) { el.append(inject, { html: true }); } })
      .transform(new Response(response.body, { status: response.status, headers: h }));
  }
};