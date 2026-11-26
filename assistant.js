// Asistente de la carta: entiende preguntas sencillas en ES / EN / FR
// y recomienda platos según alergias, gustos, hambre y presupuesto.
// Funciona sin servidor y sin coste (no usa una API de IA de pago).
const Assistant = (() => {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const has = (q, words) => words.some((w) => q.includes(w));

  const RULES = {
    avoid: {
      gluten:    ["gluten", "celiac", "coeliaq", "trigo", "wheat", " ble "],
      milk:      ["lactos", "leche", "lacteo", "dairy", "milk", " lait", "laitier"],
      egg:       ["huevo", " egg", "oeuf"],
      soy:       ["soja", " soy"],
      sulphites: ["sulfit", "sulphit"],
      crustaceans: ["crustace", "marisco", "gamba", "shellfish", "shrimp", "crevette"],
      fish:      ["pescado", " fish", "poisson"],
      peanuts:   ["cacahuete", "peanut", "arachide", "cacahuete"],
      nuts:      ["frutos secos", "frutos de cascara", "nuez", "nueces", "almendra", " nuts", " nut ", "noix", "amande", "fruits a coque"],
      celery:    ["apio", "celery", "celeri"],
      mustard:   ["mostaza", "mustard", "moutarde"],
      sesame:    ["sesamo", "sesame"],
      lupin:     ["altramuz", "altramuces", "lupin"],
      molluscs:  ["molusco", "mollusc", "mollusque", "mejillon", "calamar", "pulpo"]
    },
    vegan:   ["vegan", "vegetarian", "vegetarien", "sin carne", "no meat", "sans viande"],
    spicy:   ["picante", "spicy", "piquant", "epice", "hot sauce"],
    sweet:   ["dulce", "sweet", "sucre", "dessert", "postre", "chocolat", "goloso", "gourmand"],
    hearty:  ["hambre", "hungry", "faim", "contundente", "lleno", "full meal", "copieux", "comer"],
    light:   ["ligero", "light", "leger", "sano", "healthy", "sain", "fresco", "fresh", "frais"],
    cheap:   ["barato", "cheap", "pas cher", "economi", "poco dinero", "budget", "low cost"],
    popular: ["recomien", "recommend", "recommand", "conseil", "mejor", "best", "meilleur", "popular", "populaire"],
    local:   ["tipico", "typical", "typique", "local", "salamanca", "salamanque", "especialidad", "specialit", "regional"],
    cat: {
      bebidas:   ["beber", "bebida", "drink", "boire", "boisson", " sed ", "thirsty", "soif", "cerveza", "beer", "biere", "vino", "wine", "vin ", "zumo", "juice", " jus "],
      cafes:     ["cafe", "coffee", "capuch", "cortado", "expresso", "espresso"],
      desayunos: ["desayun", "breakfast", "petit dej", "petit-dej", "manana", "morning", "matin", "tostada", "toast"],
      tapas:     ["tapa", "picar", "snack", "racion", "aperitivo", "apero", "share", "compartir", "partager"]
    }
  };

  const TEXT = {
    es: { found: "Te recomiendo:", none: "No encuentro un plato con todo eso. Pregunta a nuestro equipo 🙂",
          unsure: "No te he entendido bien. Prueba con una de estas ideas:",
          allergyNote: "⚠️ Por alergias, confirma siempre con el personal.",
          labels: { gluten: "sin gluten", milk: "sin lácteos", egg: "sin huevo", soy: "sin soja", sulphites: "sin sulfitos", crustaceans: "sin crustáceos", fish: "sin pescado", peanuts: "sin cacahuetes", nuts: "sin frutos secos", celery: "sin apio", mustard: "sin mostaza", sesame: "sin sésamo", lupin: "sin altramuces", molluscs: "sin moluscos",
                    vegan: "vegano", spicy: "picante", sweet: "dulce", hearty: "para mucha hambre", light: "ligero",
                    cheap: "económico", popular: "lo más pedido", local: "típico de Salamanca", max: "máx." } },
    en: { found: "I recommend:", none: "I can't find a dish with all of that. Please ask our staff 🙂",
          unsure: "I didn't quite get that. Try one of these:",
          allergyNote: "⚠️ For allergies, always check with our staff.",
          labels: { gluten: "gluten-free", milk: "dairy-free", egg: "egg-free", soy: "soy-free", sulphites: "sulphite-free", crustaceans: "no shellfish", fish: "no fish", peanuts: "peanut-free", nuts: "nut-free", celery: "no celery", mustard: "no mustard", sesame: "sesame-free", lupin: "no lupin", molluscs: "no molluscs",
                    vegan: "vegan", spicy: "spicy", sweet: "sweet", hearty: "very hungry", light: "light",
                    cheap: "budget", popular: "most popular", local: "local speciality", max: "max" } },
    fr: { found: "Je vous conseille :", none: "Je ne trouve pas de plat avec tout ça. Demandez à notre équipe 🙂",
          unsure: "Je n'ai pas bien compris. Essayez une de ces idées :",
          allergyNote: "⚠️ En cas d'allergie, vérifiez toujours avec le personnel.",
          labels: { gluten: "sans gluten", milk: "sans lait", egg: "sans œuf", soy: "sans soja", sulphites: "sans sulfites", crustaceans: "sans crustacés", fish: "sans poisson", peanuts: "sans arachides", nuts: "sans fruits à coque", celery: "sans céleri", mustard: "sans moutarde", sesame: "sans sésame", lupin: "sans lupin", molluscs: "sans mollusques",
                    vegan: "végan", spicy: "épicé", sweet: "sucré", hearty: "grosse faim", light: "léger",
                    cheap: "petit budget", popular: "les plus demandés", local: "spécialité locale", max: "max" } }
  };

  const SUGGESTIONS = {
    es: ["Sin gluten 🌾", "Algo vegano 🌱", "¿Qué es lo típico de Salamanca?", "Tengo mucha hambre", "Algo dulce", "Menos de 3 €"],
    en: ["Gluten-free 🌾", "Something vegan 🌱", "What's typical from Salamanca?", "I'm very hungry", "Something sweet", "Under 3 €"],
    fr: ["Sans gluten 🌾", "Quelque chose de végan 🌱", "La spécialité de Salamanque ?", "J'ai très faim", "Quelque chose de sucré", "Moins de 3 €"]
  };

  function recommend(question, data, lang) {
    const T = TEXT[lang];
    const q = " " + norm(question) + " ";
    const avoid = Object.keys(RULES.avoid).filter((a) => has(q, RULES.avoid[a]));
    const wants = ["vegan", "spicy", "sweet", "hearty", "light", "cheap", "popular", "local"].filter((k) => has(q, RULES[k]));
    const cats = Object.keys(RULES.cat).filter((c) => has(q, RULES.cat[c]));
    const m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur)/) || q.match(/(?:menos de|under|less than|moins de|max)\s*(\d+(?:[.,]\d+)?)/);
    const maxPrice = m ? parseFloat(m[1].replace(",", ".")) : null;

    if (!avoid.length && !wants.length && !cats.length && maxPrice === null) {
      return { text: T.unsure, items: [], suggestions: SUGGESTIONS[lang] };
    }

    let pool = [];
    data.categories.forEach((c) => c.items.forEach((it) => pool.push({ ...it, catId: c.id })));

    pool = pool.filter((it) => {
      const tags = it.tags || [];
      if (avoid.some((a) => it.allergens.includes(a))) return false;
      if (wants.includes("vegan") && !tags.includes("vegan")) return false;
      if (maxPrice !== null && it.price > maxPrice) return false;
      if (cats.length && !cats.includes(it.catId)) return false;
      return true;
    });

    pool.forEach((it) => {
      const tags = it.tags || [];
      let s = 0;
      for (const w of ["spicy", "sweet", "hearty", "light", "popular", "local"]) if (wants.includes(w) && tags.includes(w)) s += 3;
      if (tags.includes("popular")) s += 1;
      if ((wants.includes("hearty") || wants.includes("local")) && it.catId === "bebidas") s -= 3;
      if (wants.includes("local") && it.catId === "cafes") s -= 2;
      if (wants.includes("cheap")) s -= it.price;
      it.score = s;
    });
    pool.sort((a, b) => b.score - a.score || a.price - b.price);

    const chips = [...avoid.map((a) => T.labels[a]), ...wants.map((w) => T.labels[w])];
    if (maxPrice !== null) chips.push(`${T.labels.max} ${maxPrice} €`);

    if (!pool.length) return { text: T.none, items: [], chips };
    return { text: T.found, items: pool.slice(0, 3), chips, note: avoid.length ? T.allergyNote : "" };
  }

  return { recommend, SUGGESTIONS };
})();
