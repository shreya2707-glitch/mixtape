/* studio.js - single-page version with real audio playback */
(() => {
  "use strict";

  /* ---------- Store: one shared state object ---------- */
  const KEY = "studio_state_v1";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      // blob: URLs die on reload, so drop tracks added from local files
      const tracks = (s?.tracks ?? []).filter(t => t.src && !t.src.startsWith("blob:"));
      const index = Math.min(s?.index ?? 0, Math.max(tracks.length - 1, 0));
      return { tracks, index };
    } catch {
      return { tracks: [], index: 0 };
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode / quota */ }
  }

  const state = load();

  /* ---------- Helpers ---------- */
  const $ = sel => document.querySelector(sel);

  // Builds DOM safely: strings become text nodes, never HTML.
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v);
    }
    el.append(...kids);
    return el;
  }

  /* ---------- Player ---------- */
  const audio = $("#player");
  const deck = $("#deckPanel");
  const label = $("#currentTrackLabel");
  const playBtn = $("#playBtn");
  const seek = $("#seek");
  const status = $("#status");

  const current = () => state.tracks[state.index];

  function loadTrack(autoplay) {
    const t = current();
    if (!t) {
      label.textContent = "NO TAPE LOADED";
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    label.textContent = `SIDE ${t.side}: ${t.title.toUpperCase()}`;
    audio.src = t.src;
    seek.value = 0;
    if (autoplay) audio.play().catch(() => {});
  }

  function togglePlay() {
    if (!current()) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  function step(dir, autoplay) {
    const n = state.tracks.length;
    if (!n) return;
    state.index = (state.index + dir + n) % n;
    save();
    loadTrack(autoplay);
    renderIfBuilder();
  }

  audio.addEventListener("play", () => {
    deck.classList.add("playing");
    playBtn.textContent = "Pause";
    playBtn.setAttribute("aria-pressed", "true");
    status.textContent = "Playing";
  });
  audio.addEventListener("pause", () => {
    deck.classList.remove("playing");
    playBtn.textContent = "Play";
    playBtn.setAttribute("aria-pressed", "false");
    status.textContent = "Paused";
  });
  audio.addEventListener("ended", () => step(1, true));
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
  });
  audio.addEventListener("error", () => {
    deck.classList.remove("playing");
    status.textContent = "Cannot play this track";
  });
  seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
  });
  playBtn.addEventListener("click", togglePlay);
  $("#prevBtn").addEventListener("click", () => step(-1, !audio.paused));
  $("#nextBtn").addEventListener("click", () => step(1, !audio.paused));

  /* ---------- Track actions ---------- */
  function addTrack({ title, side, src }) {
    state.tracks.push({ id: crypto.randomUUID(), title, side, src });
    save();
    if (state.tracks.length === 1) {
      state.index = 0;
      loadTrack(false);
    }
  }

  function removeTrack(i) {
    const wasCurrent = i === state.index;
    state.tracks.splice(i, 1);
    if (i < state.index) state.index--;
    if (state.index >= state.tracks.length) state.index = 0;
    save();
    if (wasCurrent) {
      audio.pause();
      loadTrack(false);
    }
  }

  /* ---------- Views ---------- */
  function hubView() {
    return h("div", {},
      h("h1", {}, "Mixtape Studio"),
      h("p", {}, "Build a tape in the Mixtape section. The deck on the left keeps playing while you move between sections."),
      h("div", { class: "card" },
        h("h3", {}, "Your tape"),
        h("p", { class: "subtext" }, `${state.tracks.length} track(s) loaded.`)
      )
    );
  }

  function builderView() {
    const title = h("input", { class: "input-field", type: "text", placeholder: "Track title", maxlength: "60", "aria-label": "Track title" });
    const side = h("select", { class: "input-field", "aria-label": "Side" },
      h("option", { value: "A" }, "Side A"), h("option", { value: "B" }, "Side B"));
    const url = h("input", { class: "input-field", type: "url", placeholder: "Audio URL (https://...mp3)", "aria-label": "Audio URL" });
    const file = h("input", { class: "input-field", type: "file", accept: "audio/*", "aria-label": "Audio file" });
    const msg = h("p", { class: "subtext", role: "status" });

    const form = h("div", { class: "card" },
      h("h2", {}, "Add a track"),
      title, side, url,
      h("p", { class: "subtext" }, "Or pick a local file. Local files play now but are not kept after a reload."),
      file,
      h("button", { class: "btn-action", onclick: () => {
        const name = title.value.trim();
        if (!name) { msg.textContent = "Give the track a title."; return; }
        let src = "";
        if (file.files[0]) {
          src = URL.createObjectURL(file.files[0]);
        } else {
          try {
            const u = new URL(url.value.trim());
            if (!["http:", "https:"].includes(u.protocol)) throw new Error();
            src = u.href;
          } catch { msg.textContent = "Enter a valid http(s) audio URL or choose a file."; return; }
        }
        addTrack({ title: name, side: side.value, src });
        render();
      } }, "Add to tape"),
      msg
    );

    const list = h("div", { class: "card", id: "trackList" }, h("h2", {}, "Tracklist"));
    if (!state.tracks.length) list.append(h("p", { class: "subtext" }, "No tracks yet."));
    state.tracks.forEach((t, i) => {
      list.append(h("div", { class: "track-row" + (i === state.index ? " current" : "") },
        h("span", {}, `${i + 1}. [${t.side}] ${t.title}`),
        h("span", {},
          h("button", { class: "btn-small", onclick: () => { state.index = i; save(); loadTrack(true); render(); } }, "Play"),
          h("button", { class: "btn-small", onclick: () => { removeTrack(i); render(); } }, "Remove")
        )
      ));
    });

    return h("div", {}, form, list);
  }

  function placeholder(name) {
    return () => h("div", { class: "card" }, h("h2", {}, name), h("p", {}, "Not ported to the single-page layout yet."));
  }

  const ROUTES = [
    { id: "hub", name: "Hub", view: hubView },
    { id: "builder", name: "Mixtape", view: builderView },
    { id: "moods", name: "Moods", view: placeholder("Moods") },
    { id: "constellations", name: "Constellations", view: placeholder("Constellations") },
    { id: "journal", name: "Journal", view: placeholder("Journal") },
    { id: "pomodoro", name: "Pomodoro", view: placeholder("Pomodoro") },
    { id: "release", name: "Release", view: placeholder("Release") },
    { id: "capsule", name: "Capsule", view: placeholder("Capsule") }
  ];

  /* ---------- Router ---------- */
  const nav = $("#nav");
  const view = $("#view");

  ROUTES.forEach(r => nav.append(h("a", { class: "nav-btn", href: `#/${r.id}`, "data-route": r.id }, r.name)));

  function routeId() {
    const id = location.hash.replace(/^#\//, "");
    return ROUTES.some(r => r.id === id) ? id : "hub";
  }

  function render() {
    const id = routeId();
    nav.querySelectorAll(".nav-btn").forEach(a => {
      const on = a.dataset.route === id;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    view.replaceChildren(ROUTES.find(r => r.id === id).view());
  }

  function renderIfBuilder() { if (routeId() === "builder") render(); }

  window.addEventListener("hashchange", () => { render(); view.focus(); });

  /* ---------- Boot ---------- */
  loadTrack(false);
  render();
})();
