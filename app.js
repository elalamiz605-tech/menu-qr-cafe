// Menú QR — todo el contenido viene de menu.json
const UI = {
  es: { search: "Buscar un plato…", vegan: "Solo vegano", empty: "No hay resultados.",
        allergens: "¿Alergias? Pregunta a nuestro equipo.", whatsapp: "Reservar por WhatsApp",
        tags: { popular: "⭐ Popular", vegan: "🌱 Vegano", spicy: "🌶️ Picante" } },
  en: { search: "Search a dish…", vegan: "Vegan only", empty: "No results.",
        allergens: "Allergies? Please ask our staff.", whatsapp: "Book on WhatsApp",
        tags: { popular: "⭐ Popular", vegan: "🌱 Vegan", spicy: "🌶️ Spicy" } },
  fr: { search: "Chercher un plat…", vegan: "Végan seulement", empty: "Aucun résultat.",
        allergens: "Allergies ? Demandez à notre équipe.", whatsapp: "Réserver sur WhatsApp",
        tags: { popular: "⭐ Populaire", vegan: "🌱 Végan", spicy: "🌶️ Épicé" } }
};

const ALLERGENS = {
  gluten:    { es: "Gluten",   en: "Gluten",    fr: "Gluten" },
  milk:      { es: "Lácteos",  en: "Milk",      fr: "Lait" },
  egg:       { es: "Huevo",    en: "Egg",       fr: "Œuf" },
  soy:       { es: "Soja",     en: "Soy",       fr: "Soja" },
  sulphites: { es: "Sulfitos", en: "Sulphites", fr: "Sulfites" }
};

let data = null;
let lang = pickLanguage();

function pickLanguage() {
  const saved = (() => { try { return localStorage.getItem("menu-lang"); } catch { return null; } })();
  if (saved && UI[saved]) return saved;
  const browser = (navigator.language || "es").slice(0, 2);
  return UI[browser] ? browser : "es";
}

const $ = (id) => document.getElementById(id);
const t = (obj) => obj[lang] || obj.es;
const money = (n) => n.toFixed(2).replace(".", lang === "en" ? "." : ",") + " " + data.cafe.currency;
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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
  $("whatsapp").href = `https://wa.me/${data.cafe.whatsapp}`;
  document.querySelectorAll(".lang button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  $("tabs").innerHTML = data.categories
    .map((c) => `<a href="#${c.id}">${c.icon} ${t(c.name)}</a>`).join("");
}

function renderMenu() {
  const ui = UI[lang];
  const query = normalize($("search").value.trim());
  const veganOnly = $("vegan-only").checked;

  const html = data.categories.map((cat) => {
    const items = cat.items.filter((it) => {
      if (veganOnly && !(it.tags || []).includes("vegan")) return false;
      if (query && !normalize(t(it.name)).includes(query)) return false;
      return true;
    });
    if (!items.length) return "";
    return `<section class="category" id="${cat.id}">
      <h2>${cat.icon} ${t(cat.name)}</h2>
      ${items.map((it) => `
        <article class="item">
          <div>
            <div class="item-name">${t(it.name)}</div>
            <div class="item-meta">
              ${(it.tags || []).map((tag) => `<span class="badge ${tag}">${ui.tags[tag]}</span>`).join("")}
              ${it.allergens.map((a) => `<span class="badge">${t(ALLERGENS[a])}</span>`).join("")}
            </div>
          </div>
          <div class="price">${money(it.price)}</div>
        </article>`).join("")}
    </section>`;
  }).join("");

  $("menu").innerHTML = html || `<p class="empty">${ui.empty}</p>`;
}

function setLanguage(next) {
  lang = next;
  try { localStorage.setItem("menu-lang", next); } catch {}
  renderStatic();
  renderMenu();
}

// Surligne l'onglet de la catégorie visible
function watchSections() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      document.querySelectorAll(".tabs a").forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".category").forEach((s) => observer.observe(s));
}

async function init() {
  const res = await fetch("menu.json");
  data = await res.json();
  renderStatic();
  renderMenu();
  watchSections();

  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => { setLanguage(b.dataset.lang); watchSections(); }));
  $("search").addEventListener("input", () => { renderMenu(); watchSections(); });
  $("vegan-only").addEventListener("change", () => { renderMenu(); watchSections(); });
}

init().catch(() => {
  $("menu").innerHTML = '<p class="empty">Error al cargar el menú.</p>';
});
