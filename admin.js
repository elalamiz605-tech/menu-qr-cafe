// Panel del negocio: editar la carta sin código
const ALLERGENS = { gluten: "Gluten", crustaceans: "Crustáceos", egg: "Huevo", fish: "Pescado", peanuts: "Cacahuetes",
  soy: "Soja", milk: "Lácteos", nuts: "Frutos de cáscara", celery: "Apio", mustard: "Mostaza", sesame: "Sésamo",
  sulphites: "Sulfitos", lupin: "Altramuces", molluscs: "Moluscos" };
const TAGS = { popular: "⭐ Popular", vegan: "🌱 Vegano", spicy: "🌶️ Picante", sweet: "🍫 Dulce",
               hearty: "💪 Contundente", light: "🍃 Ligero", local: "📍 Típico" };

let data;
let dirty = false;
let photoTarget = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setStatus(msg) { $("status").textContent = msg; }
function markDirty() { dirty = true; setStatus("Cambios sin guardar"); }

function itemHtml(it, ci, ii) {
  const path = `${ci}.${ii}`;
  const preview = it.photo
    ? `<img src="${esc(it.photo)}" alt="">`
    : `<span>${esc(it.emoji || "🍽️")}</span>`;
  return `
  <div class="row" data-path="${path}">
    <div class="photo">
      <button type="button" class="photo-btn" data-act="photo" title="Cambiar foto">${preview}</button>
      ${it.photo ? `<button type="button" class="link" data-act="nophoto">Quitar foto</button>`
                 : `<button type="button" class="link" data-act="photo">📷 Añadir foto</button>`}
    </div>
    <div class="fields">
      <div class="grid3">
        <label>Nombre (ES)<input data-f="name.es" value="${esc(it.name.es)}"></label>
        <label>English<input data-f="name.en" value="${esc(it.name.en)}"></label>
        <label>Français<input data-f="name.fr" value="${esc(it.name.fr)}"></label>
      </div>
      <div class="grid-price">
        <label>Precio (€)<input data-f="price" type="number" step="0.05" min="0" value="${esc(it.price)}"></label>
        <label>Emoji<input data-f="emoji" maxlength="4" value="${esc(it.emoji || "")}"></label>
        <label class="grow">Descripción (ES, opcional)<input data-f="description.es" value="${esc(it.description?.es || "")}"></label>
      </div>
      <div class="checks">
        <span class="muted">Alérgenos:</span>
        ${Object.entries(ALLERGENS).map(([k, v]) =>
          `<label class="check"><input type="checkbox" data-list="allergens" value="${k}" ${it.allergens.includes(k) ? "checked" : ""}>${v}</label>`).join("")}
      </div>
      <div class="checks">
        <span class="muted">Etiquetas:</span>
        ${Object.entries(TAGS).map(([k, v]) =>
          `<label class="check"><input type="checkbox" data-list="tags" value="${k}" ${(it.tags || []).includes(k) ? "checked" : ""}>${v}</label>`).join("")}
      </div>
    </div>
    <button type="button" class="del" data-act="delete" title="Borrar plato" aria-label="Borrar plato">🗑️</button>
  </div>`;
}

function render() {
  $("cafe-name").value = data.cafe.name;
  $("cafe-whatsapp").value = data.cafe.whatsapp;
  $("categories").innerHTML = data.categories.map((cat, ci) => `
    <section class="card">
      <h2>${esc(cat.icon)} ${esc(cat.name.es)} <span class="muted count">${cat.items.length} platos</span></h2>
      ${cat.items.map((it, ii) => itemHtml(it, ci, ii)).join("")}
      <button type="button" class="btn ghost add" data-add="${ci}">＋ Añadir plato</button>
    </section>`).join("");
}

function getItem(el) {
  const row = el.closest(".row");
  if (!row) return null;
  const [ci, ii] = row.dataset.path.split(".").map(Number);
  return { item: data.categories[ci].items[ii], ci, ii };
}

function setField(obj, field, value) {
  if (field === "price") { obj.price = Math.max(0, parseFloat(value) || 0); return; }
  if (field === "description.es") {
    if (!value.trim()) { delete obj.description; return; }
    obj.description = { es: value, en: obj.description?.en || value, fr: obj.description?.fr || value };
    return;
  }
  const [a, b] = field.split(".");
  if (b) obj[a][b] = value; else obj[a] = value;
}

// Reduce la foto a 480 px para que la carta cargue rápido
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 480;
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function toCSV() {
  const cols = ["categoria_es", "categoria_en", "categoria_fr", "icono", "nombre_es", "nombre_en", "nombre_fr",
                "descripcion_es", "descripcion_en", "descripcion_fr", "precio", "alergenos", "etiquetas", "emoji", "foto", "disponible"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.join(",")];
  data.categories.forEach((c) => c.items.forEach((it) => {
    rows.push([c.name.es, c.name.en, c.name.fr, c.icon, it.name.es, it.name.en, it.name.fr,
      it.description?.es, it.description?.en, it.description?.fr, String(it.price).replace(".", ","),
      it.allergens.join(";"), (it.tags || []).join(";"), it.emoji,
      it.photo && !it.photo.startsWith("data:") ? it.photo : "", "si"].map(q).join(","));
  }));
  return rows.join("\n");
}

async function init() {
  ({ data } = await MenuData.load());
  render();
  setStatus("");

  $("cafe-name").addEventListener("input", (e) => { data.cafe.name = e.target.value; markDirty(); });
  $("cafe-whatsapp").addEventListener("input", (e) => { data.cafe.whatsapp = e.target.value.replace(/[^\d]/g, ""); markDirty(); });

  $("categories").addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    const ref = getItem(e.target);
    if (!f || !ref) return;
    setField(ref.item, f, e.target.value);
    if (f === "emoji" && !ref.item.photo) e.target.closest(".row").querySelector(".photo-btn").innerHTML = `<span>${esc(e.target.value || "🍽️")}</span>`;
    markDirty();
  });

  $("categories").addEventListener("change", (e) => {
    const listName = e.target.dataset.list;
    const ref = getItem(e.target);
    if (!listName || !ref) return;
    const set = new Set(ref.item[listName] || []);
    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
    ref.item[listName] = [...set];
    markDirty();
  });

  $("categories").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      data.categories[+add.dataset.add].items.push({
        name: { es: "Nuevo plato", en: "New dish", fr: "Nouveau plat" },
        price: 0, allergens: [], tags: [], emoji: "🍽️", photo: "" });
      render(); markDirty();
      const rows = add.parentElement.querySelectorAll(".row");
      rows[rows.length - 1]?.querySelector("input")?.select();
      return;
    }
    const btn = e.target.closest("[data-act]");
    const ref = btn && getItem(btn);
    if (!ref) return;
    if (btn.dataset.act === "photo") { photoTarget = ref.item; $("photo-input").click(); }
    if (btn.dataset.act === "nophoto") { ref.item.photo = ""; render(); markDirty(); }
    if (btn.dataset.act === "delete" && confirmDelete(ref.item)) {
      data.categories[ref.ci].items.splice(ref.ii, 1); render(); markDirty();
    }
  });

  $("photo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !photoTarget) return;
    try {
      photoTarget.photo = await resizePhoto(file);
      render(); markDirty();
    } catch { setStatus("No se pudo leer esa imagen."); }
  });

  $("save").addEventListener("click", () => {
    try {
      MenuData.store.set(data);
      dirty = false;
      setStatus("✅ Guardado. Abre la carta para verlo.");
    } catch {
      setStatus("⚠️ No hay espacio: usa fotos más pequeñas o menos fotos.");
    }
  });
  $("reset").addEventListener("click", async () => {
    MenuData.store.clear();
    ({ data } = await MenuData.load({ useDraft: false }));
    render(); dirty = false; setStatus("Carta original restaurada.");
  });
  $("dl-json").addEventListener("click", () =>
    download("menu.json", JSON.stringify(data, null, 2), "application/json"));
  $("dl-csv").addEventListener("click", () =>
    download("plantilla-carta.csv", "﻿" + toCSV(), "text/csv;charset=utf-8"));

  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
}

// Confirmación sin ventana del navegador: segundo clic en 3 s
let pendingDelete = null;
function confirmDelete(item) {
  if (pendingDelete === item) { pendingDelete = null; return true; }
  pendingDelete = item;
  setStatus(`Pulsa 🗑️ otra vez para borrar «${item.name.es}».`);
  setTimeout(() => { if (pendingDelete === item) { pendingDelete = null; setStatus(""); } }, 3000);
  return false;
}

init().catch(() => setStatus("Error al cargar la carta."));
