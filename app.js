// Menú QR — la carta viene de menu-data.js (panel, Google Sheets o menu.json)
const UI = {
  es: { search: "Buscar un plato…", vegan: "Solo vegano", empty: "No hay resultados.",
        allergens: "¿Alergias? Pregunta a nuestro equipo.", whatsapp: "Reservar por WhatsApp",
        draft: "Vista previa con tus cambios del panel", draftReset: "Ver carta original",
        askBtn: "¿Qué pido?", askTitle: "Asistente de la carta", askHello: "¡Hola! 👋 Dime qué te apetece o si tienes alguna alergia.",
        askPlaceholder: "Ej.: algo sin gluten y barato", send: "Enviar", close: "Cerrar",
        tags: { popular: "⭐ Popular", vegan: "🌱 Vegano", spicy: "🌶️ Picante", sweet: "🍫 Dulce", hearty: "💪 Contundente", light: "🍃 Ligero", local: "📍 Típico" } },
  en: { search: "Search a dish…", vegan: "Vegan only", empty: "No results.",
        allergens: "Allergies? Please ask our staff.", whatsapp: "Book on WhatsApp",
        draft: "Preview with your panel changes", draftReset: "See original menu",
        askBtn: "What should I order?", askTitle: "Menu assistant", askHello: "Hi! 👋 Tell me what you feel like, or about any allergy.",
        askPlaceholder: "e.g. something gluten-free and cheap", send: "Send", close: "Close",
        tags: { popular: "⭐ Popular", vegan: "🌱 Vegan", spicy: "🌶️ Spicy", sweet: "🍫 Sweet", hearty: "💪 Hearty", light: "🍃 Light", local: "📍 Local" } },
  fr: { search: "Chercher un plat…", vegan: "Végan seulement", empty: "Aucun résultat.",
        allergens: "Allergies ? Demandez à notre équipe.", whatsapp: "Réserver sur WhatsApp",
        draft: "Aperçu avec vos modifications du panneau", draftReset: "Voir la carte d'origine",
        askBtn: "Que commander ?", askTitle: "Assistant de la carte", askHello: "Bonjour ! 👋 Dites-moi ce qui vous ferait plaisir, ou vos allergies.",
        askPlaceholder: "Ex. : sans gluten et pas cher", send: "Envoyer", close: "Fermer",
        tags: { popular: "⭐ Populaire", vegan: "🌱 Végan", spicy: "🌶️ Épicé", sweet: "🍫 Sucré", hearty: "💪 Copieux", light: "🍃 Léger", local: "📍 Local" } }
};

const ALLERGENS = {
  gluten:      { es: "Gluten",          en: "Gluten",      fr: "Gluten" },
  crustaceans: { es: "Crustáceos",      en: "Crustaceans", fr: "Crustacés" },
  egg:         { es: "Huevo",           en: "Egg",         fr: "Œuf" },
  fish:        { es: "Pescado",         en: "Fish",        fr: "Poisson" },
  peanuts:     { es: "Cacahuetes",      en: "Peanuts",     fr: "Arachides" },
  soy:         { es: "Soja",            en: "Soy",         fr: "Soja" },
  milk:        { es: "Lácteos",         en: "Milk",        fr: "Lait" },
  nuts:        { es: "Frutos de cáscara", en: "Tree nuts", fr: "Fruits à coque" },
  celery:      { es: "Apio",            en: "Celery",      fr: "Céleri" },
  mustard:     { es: "Mostaza",         en: "Mustard",     fr: "Moutarde" },
  sesame:      { es: "Sésamo",          en: "Sesame",      fr: "Sésame" },
  sulphites:   { es: "Sulfitos",        en: "Sulphites",   fr: "Sulfites" },
  lupin:       { es: "Altramuces",      en: "Lupin",       fr: "Lupin" },
  molluscs:    { es: "Moluscos",        en: "Molluscs",    fr: "Mollusques" }
};

let data = null;
let source = "json";
let lang = pickLanguage();

function pickLanguage() {
  const saved = (() => { try { return localStorage.getItem("menu-lang"); } catch { return null; } })();
  if (saved && UI[saved]) return saved;
  const browser = (navigator.language || "es").slice(0, 2);
  return UI[browser] ? browser : "es";
}

const $ = (id) => document.getElementById(id);
const t = (obj) => (obj && (obj[lang] || obj.es)) || "";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => n.toFixed(2).replace(".", lang === "en" ? "." : ",") + " " + (data.cafe.currency || "€");
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const itemId = (it) => "p-" + normalize(it.name.es).replace(/[^a-z0-9]+/g, "-");

function thumb(it) {
  // Si la foto no carga, se muestra el emoji en su lugar
  if (it.photo) return `<img class="thumb" src="${esc(it.photo)}" alt="${esc(t(it.name))}" loading="lazy"
    onerror="this.outerHTML='<div class=&quot;thumb thumb-emoji&quot; aria-hidden=&quot;true&quot;>${esc(it.emoji || "🍽️")}</div>'">`;
  return `<div class="thumb thumb-emoji" aria-hidden="true">${esc(it.emoji || "🍽️")}</div>`;
}

function renderStatic() {
  const ui = UI[lang];
  document.documentElement.lang = lang;
  $("cafe-name").textContent = data.cafe.name;
  $("cafe-tagline").textContent = t(data.cafe.tagline);
  $("cafe-hours").textContent = t(data.cafe.hours);
  $("search").placeholder = ui.search;
  $("vegan-label").textContent = ui.vegan;
  $("allergen-note").textContent = ui.allergens;
  $("whatsapp").textContent = ui.whatsapp;
  $("whatsapp").href = `https://wa.me/${encodeURIComponent(data.cafe.whatsapp)}`;
  $("ask-open").innerHTML = `✨ ${esc(ui.askBtn)}`;
  $("ask-title").textContent = ui.askTitle;
  $("ask-input").placeholder = ui.askPlaceholder;
  $("ask-send").textContent = ui.send;
  $("ask-close").setAttribute("aria-label", ui.close);
  $("draft-bar").hidden = source !== "draft";
  $("draft-text").textContent = ui.draft;
  $("draft-reset").textContent = ui.draftReset;
  document.querySelectorAll(".lang button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("tabs").innerHTML = data.categories
    .map((c) => `<a href="#${esc(c.id)}">${esc(c.icon)} ${esc(t(c.name))}</a>`).join("");
}

function renderMenu() {
  const ui = UI[lang];
  const query = normalize($("search").value.trim());
  const veganOnly = $("vegan-only").checked;

  const html = data.categories.map((cat) => {
    const items = cat.items.filter((it) => {
      if (veganOnly && !(it.tags || []).includes("vegan")) return false;
      if (query && !normalize(t(it.name) + " " + t(it.description)).includes(query)) return false;
      return true;
    });
    if (!items.length) return "";
    return `<section class="category" id="${esc(cat.id)}">
      <h2>${esc(cat.icon)} ${esc(t(cat.name))}</h2>
      ${items.map((it) => `
        <article class="item" id="${itemId(it)}">
          ${thumb(it)}
          <div class="item-body">
            <div class="item-top">
              <div class="item-name">${esc(t(it.name))}</div>
              <div class="price">${money(it.price)}</div>
            </div>
            ${it.description ? `<p class="item-desc">${esc(t(it.description))}</p>` : ""}
            <div class="item-meta">
              ${(it.tags || []).filter((tag) => ui.tags[tag]).map((tag) => `<span class="badge ${tag}">${ui.tags[tag]}</span>`).join("")}
              ${it.allergens.filter((a) => ALLERGENS[a]).map((a) => `<span class="badge">${t(ALLERGENS[a])}</span>`).join("")}
            </div>
          </div>
        </article>`).join("")}
    </section>`;
  }).join("");

  $("menu").innerHTML = html || `<p class="empty">${ui.empty}</p>`;
  watchSections();
}

let observer;
function watchSections() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      document.querySelectorAll(".tabs a").forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".category").forEach((s) => observer.observe(s));
}

// ---------- Asistente ----------
function addMsg(html, who = "bot") {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.innerHTML = html;
  $("ask-log").appendChild(div);
  $("ask-log").scrollTop = $("ask-log").scrollHeight;
}

function suggestionsHtml(list) {
  return `<div class="chips">${list.map((s) => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
}

function resetChat() {
  $("ask-log").innerHTML = "";
  addMsg(esc(UI[lang].askHello) + suggestionsHtml(Assistant.SUGGESTIONS[lang]));
}

function ask(question) {
  if (!question.trim()) return;
  addMsg(esc(question), "me");
  const r = Assistant.recommend(question, data, lang);
  let html = "";
  if (r.chips && r.chips.length) html += `<div class="chips small">${r.chips.map((c) => `<span class="chip on">${esc(c)}</span>`).join("")}</div>`;
  html += `<p>${esc(r.text)}</p>`;
  if (r.items.length) {
    html += r.items.map((it) => `
      <button class="pick" data-target="${itemId(it)}">
        <span class="pick-emoji">${esc(it.emoji || "🍽️")}</span>
        <span class="pick-name">${esc(t(it.name))}</span>
        <span class="pick-price">${money(it.price)}</span>
      </button>`).join("");
  }
  if (r.note) html += `<p class="note">${esc(r.note)}</p>`;
  if (r.suggestions) html += suggestionsHtml(r.suggestions);
  addMsg(html);
}

function openChat() {
  $("ask-panel").hidden = false;
  $("ask-open").hidden = true;
  if (!$("ask-log").children.length) resetChat();
  $("ask-input").focus();
}
function closeChat() {
  $("ask-panel").hidden = true;
  $("ask-open").hidden = false;
}

function setLanguage(next) {
  lang = next;
  try { localStorage.setItem("menu-lang", next); } catch {}
  renderStatic();
  renderMenu();
  if (!$("ask-panel").hidden) resetChat(); else $("ask-log").innerHTML = "";
}

async function init() {
  ({ data, source } = await MenuData.load());
  renderStatic();
  renderMenu();

  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => setLanguage(b.dataset.lang)));
  $("search").addEventListener("input", renderMenu);
  $("vegan-only").addEventListener("change", renderMenu);
  $("draft-reset").addEventListener("click", () => { MenuData.store.clear(); location.reload(); });

  $("ask-open").addEventListener("click", openChat);
  $("ask-close").addEventListener("click", closeChat);
  $("ask-form").addEventListener("submit", (e) => {
    e.preventDefault();
    ask($("ask-input").value);
    $("ask-input").value = "";
  });
  $("ask-log").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-q]");
    if (chip) return ask(chip.dataset.q);
    const pick = e.target.closest(".pick");
    if (pick) {
      $("search").value = ""; $("vegan-only").checked = false; renderMenu();
      const el = document.getElementById(pick.dataset.target);
      closeChat();
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      }
    }
  });
}

init().catch(() => {
  $("menu").innerHTML = '<p class="empty">Error al cargar el menú.</p>';
});
