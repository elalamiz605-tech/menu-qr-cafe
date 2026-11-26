// Carga de la carta — compartido por el menú (index.html) y el panel (admin.html)
// Orden: 1) cambios guardados en el panel (este navegador) 2) Google Sheets 3) menu.json
const MenuData = (() => {
  const DRAFT_KEY = "menu-qr-draft";

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; } },
    set(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); },
    clear() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
  };

  // Lector CSV sencillo (soporta comillas y comas dentro de comillas)
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  const list = (s) => (s || "").split(/[;|]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

  // Convierte la hoja de Google (CSV) en categorías
  function fromSheet(csv, base) {
    const [head, ...rows] = parseCSV(csv);
    const h = head.map((x) => x.trim().toLowerCase());
    const col = (r, name) => (r[h.indexOf(name)] || "").trim();
    const cats = [];
    for (const r of rows) {
      if (col(r, "disponible").toLowerCase() === "no") continue;
      const catEs = col(r, "categoria_es");
      let cat = cats.find((c) => c.name.es === catEs);
      if (!cat) {
        cat = { id: catEs.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-"),
                icon: col(r, "icono") || "🍽️",
                name: { es: catEs, en: col(r, "categoria_en") || catEs, fr: col(r, "categoria_fr") || catEs },
                items: [] };
        cats.push(cat);
      }
      const nameEs = col(r, "nombre_es");
      cat.items.push({
        name: { es: nameEs, en: col(r, "nombre_en") || nameEs, fr: col(r, "nombre_fr") || nameEs },
        description: col(r, "descripcion_es") ? {
          es: col(r, "descripcion_es"), en: col(r, "descripcion_en") || col(r, "descripcion_es"),
          fr: col(r, "descripcion_fr") || col(r, "descripcion_es") } : undefined,
        price: parseFloat(col(r, "precio").replace(",", ".")) || 0,
        allergens: list(col(r, "alergenos")),
        tags: list(col(r, "etiquetas")),
        emoji: col(r, "emoji") || "🍽️",
        photo: col(r, "foto")
      });
    }
    return { ...base, categories: cats };
  }

  async function load({ useDraft = true } = {}) {
    if (useDraft) {
      const draft = store.get();
      if (draft) return { data: draft, source: "draft" };
    }
    const base = await (await fetch("menu.json", { cache: "no-store" })).json();
    if (base.cafe.sheetCsvUrl) {
      try {
        const csv = await (await fetch(base.cafe.sheetCsvUrl, { cache: "no-store" })).text();
        return { data: fromSheet(csv, base), source: "sheet" };
      } catch { /* si falla, usamos menu.json */ }
    }
    return { data: base, source: "json" };
  }

  return { load, store, parseCSV, fromSheet };
})();
