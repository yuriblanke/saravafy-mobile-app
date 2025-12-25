import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";

function loadDotEnvIfPresent() {
  // Minimal .env loader (KEY=VALUE) without extra deps.
  // Only sets vars missing from process.env.
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

function getAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniq(list) {
  return Array.from(new Set(list));
}

function coerceTags(value) {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === "string")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

function formatTagsForUpdate(originalTagsValue, tagsArray) {
  // Try to preserve the storage format.
  if (typeof originalTagsValue === "string") {
    return tagsArray.join(", ");
  }
  // For text[] or json/jsonb arrays, PostgREST accepts JSON arrays.
  return tagsArray;
}

const ORIXAS = [
  // Keep a few common variants (accent/no accent). Add more if you use them.
  { key: "exu", variants: ["exu"] },
  { key: "ogum", variants: ["ogum"] },
  { key: "oxossi", variants: ["oxossi", "oxóssi"] },
  { key: "iemanja", variants: ["iemanja", "iemanjá"] },
  { key: "xango", variants: ["xango", "xangô"] },
  { key: "oxum", variants: ["oxum"] },
  { key: "iansa", variants: ["iansa", "iansã"] },
  {
    key: "obaluaie",
    variants: [
      // Você usa "Obaluaê" como forma principal.
      "obaluae",
      "obaluaê",
      "obaluaie",
      "obaluaiê",
      // Sinônimo muito comum em letras/casas; mapeia pro mesmo key.
      "omulu",
      "omolú",
    ],
  },
  { key: "oxala", variants: ["oxala", "oxalá"] },

  // Outros orixás comuns
  { key: "nana", variants: ["nana", "nanã"] },
  { key: "ossaim", variants: ["ossaim", "osaim", "ossain"] },
  { key: "oba", variants: ["oba", "obá"] },
  { key: "ewa", variants: ["ewa", "ewá"] },
  { key: "oxumare", variants: ["oxumare", "oxumaré"] },
  {
    key: "logunede",
    variants: ["logunede", "logunedé", "logun ede", "logun edé"],
  },
  { key: "ibeji", variants: ["ibeji"] },
  { key: "oxaguian", variants: ["oxaguian", "oxaguiã"] },
];

const DEFAULT_CANONICAL_TAG = {
  exu: "Exu",
  ogum: "Ogum",
  oxossi: "Oxóssi",
  iemanja: "Iemanjá",
  xango: "Xangô",
  oxum: "Oxum",
  iansa: "Iansã",
  obaluaie: "Obaluaê",
  oxala: "Oxalá",

  nana: "Nanã",
  ossaim: "Ossanha",
  oba: "Obá",
  ewa: "Ewá",
  oxumare: "Oxumaré",
  logunede: "Logunedé",
  ibeji: "Ibeji",
  oxaguian: "Oxaguiã",
};

function detectMentionsInText(originalText) {
  const textNorm = normalizeText(originalText);
  const found = new Set();

  for (const orixa of ORIXAS) {
    // Search by normalized variants with word boundaries.
    const normalizedVariants = uniq(orixa.variants.map(normalizeText));
    const re = new RegExp(
      `\\b(${normalizedVariants.map(escapeRegExp).join("|")})\\b`,
      "g"
    );
    if (re.test(textNorm)) {
      found.add(orixa.key);
    }
  }

  return Array.from(found);
}

function extractMatchedVariantsFromOriginalText(originalText, variants) {
  const parts = variants.map(escapeRegExp);
  if (parts.length === 0) return [];
  const re = new RegExp(`\\b(${parts.join("|")})\\b`, "giu");
  const matches = [];
  for (const m of originalText.matchAll(re)) {
    if (m[1]) matches.push(m[1]);
  }
  return matches;
}

async function fetchAllRowsPaged(supabase, table, selectColumns) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .range(from, to);
    if (error) throw error;

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function chooseCanonicalTagsFromExistingTagUsage(points) {
  // For each orixa key, pick the most frequent exact spelling found in existing tags.
  const countsByKey = new Map();

  for (const p of points) {
    const tags = coerceTags(p.tags);

    for (const orixa of ORIXAS) {
      for (const variant of orixa.variants) {
        const matches = tags.filter(
          (t) => normalizeText(t) === normalizeText(variant)
        );
        if (matches.length === 0) continue;

        const map = countsByKey.get(orixa.key) ?? new Map();
        for (const exact of matches) {
          map.set(exact, (map.get(exact) ?? 0) + 1);
        }
        countsByKey.set(orixa.key, map);
      }
    }
  }

  const canonical = {};

  for (const orixa of ORIXAS) {
    const map = countsByKey.get(orixa.key);
    if (!map || map.size === 0) {
      canonical[orixa.key] =
        DEFAULT_CANONICAL_TAG[orixa.key] ?? orixa.variants[0];
      continue;
    }

    let best = null;
    let bestCount = -1;
    for (const [k, c] of map.entries()) {
      if (c > bestCount) {
        best = k;
        bestCount = c;
      }
    }

    canonical[orixa.key] = best;
  }

  return canonical;
}

function buildVariantReport(points) {
  const report = {};

  for (const orixa of ORIXAS) {
    report[orixa.key] = {
      variantsInTags: new Map(),
      variantsInLyrics: new Map(),
      examples: [],
    };
  }

  for (const p of points) {
    const tags = coerceTags(p.tags);
    const lyrics = String(p.lyrics ?? "");

    for (const orixa of ORIXAS) {
      // tags
      for (const t of tags) {
        if (orixa.variants.some((v) => normalizeText(v) === normalizeText(t))) {
          const map = report[orixa.key].variantsInTags;
          map.set(t, (map.get(t) ?? 0) + 1);
        }
      }

      // lyrics
      const matched = extractMatchedVariantsFromOriginalText(
        lyrics,
        orixa.variants
      );
      for (const m of matched) {
        const map = report[orixa.key].variantsInLyrics;
        map.set(m, (map.get(m) ?? 0) + 1);
      }

      if (matched.length > 0 && report[orixa.key].examples.length < 5) {
        report[orixa.key].examples.push({ id: p.id, title: p.title });
      }
    }
  }

  return report;
}

function printReport(report, canonical) {
  console.log("\n=== Orixás: grafias encontradas (tags/letras) ===\n");

  for (const orixa of ORIXAS) {
    const entry = report[orixa.key];
    const tagList = Array.from(entry.variantsInTags.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const lyrList = Array.from(entry.variantsInLyrics.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const totalTags = tagList.reduce((acc, [, c]) => acc + c, 0);
    const totalLyrics = lyrList.reduce((acc, [, c]) => acc + c, 0);

    console.log(
      `- ${orixa.key} (tag canônica sugerida: "${canonical[orixa.key]}")`
    );
    console.log(`  - Em tags: ${totalTags} ocorrência(s)`);
    if (tagList.length) {
      console.log(
        "    " +
          tagList
            .slice(0, 20)
            .map(([v, c]) => `${JSON.stringify(v)}(${c})`)
            .join(", ")
      );
    }

    console.log(`  - Em letras: ${totalLyrics} ocorrência(s)`);
    if (lyrList.length) {
      console.log(
        "    " +
          lyrList
            .slice(0, 20)
            .map(([v, c]) => `${JSON.stringify(v)}(${c})`)
            .join(", ")
      );
    }

    if (entry.examples.length) {
      console.log(
        "  - Exemplos: " +
          entry.examples.map((e) => `${e.title ?? e.id}`).join(" | ")
      );
    }

    console.log("");
  }
}

async function main() {
  loadDotEnvIfPresent();

  const [, , command, ...args] = process.argv;

  const authArg = args.find((a) => a.startsWith("--auth="));
  const authMode = authArg ? authArg.split("=")[1] : undefined;

  if (!command || !["report", "apply"].includes(command)) {
    console.log("Usage:");
    console.log("  node scripts/orixa-tags.mjs report");
    console.log("  node scripts/orixa-tags.mjs report --auth=anon");
    console.log("  node scripts/orixa-tags.mjs apply [--limit=50]");
    console.log("");
    console.log("Env (recommended):");
    console.log("  EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY");
    console.log("  SUPABASE_SERVICE_ROLE_KEY (required for apply)");
    process.exit(1);
  }

  const url = getSupabaseUrl();
  if (!url) throw new Error("Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL");

  const table = process.env.SUPABASE_POINTS_TABLE || "pontos";

  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const serviceRoleKey = getServiceRoleKey();
  const anonKey = getAnonKey();

  const needsWrite = command === "apply";
  if (needsWrite && !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (recommended to bypass RLS for maintenance updates)."
    );
  }

  let supabaseKey = serviceRoleKey || anonKey;

  if (authMode) {
    if (!["anon", "service"].includes(authMode)) {
      throw new Error(
        "Invalid --auth value. Use --auth=anon or --auth=service"
      );
    }
    if (authMode === "anon") supabaseKey = anonKey;
    if (authMode === "service") supabaseKey = serviceRoleKey;
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing anon key. Set EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
    );
  }

  const supabase = createClient(url, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all points (or limit if requested)
  // Include is_active/restricted so we can diagnose app visibility.
  const selectColumns = "id,title,lyrics,tags,is_active,restricted";
  const points = await fetchAllRowsPaged(supabase, table, selectColumns);
  const pointsLimited =
    typeof limit === "number" ? points.slice(0, limit) : points;

  const canonical = chooseCanonicalTagsFromExistingTagUsage(points);
  const report = buildVariantReport(points);

  if (command === "report") {
    printReport(report, canonical);
    console.log(`Total pontos lidos: ${points.length}`);
    const appVisible = points.filter(
      (p) => p?.is_active === true && p?.restricted === false
    ).length;
    console.log(
      `Total visíveis no app (is_active=true & restricted=false): ${appVisible}`
    );
    return;
  }

  // APPLY
  let updated = 0;
  let scanned = 0;

  for (const p of pointsLimited) {
    scanned++;

    const existingTags = coerceTags(p.tags);
    const existingNorm = new Set(existingTags.map(normalizeText));

    const mentionedKeys = detectMentionsInText(p.lyrics);
    const toAdd = mentionedKeys
      .map((k) => canonical[k] ?? DEFAULT_CANONICAL_TAG[k] ?? k)
      .filter((t) => !existingNorm.has(normalizeText(t)));

    if (toAdd.length === 0) continue;

    const newTags = uniq([...existingTags, ...toAdd]);

    // Update; try to preserve tag format
    const payloadTags = formatTagsForUpdate(p.tags, newTags);

    const { error } = await supabase
      .from(table)
      .update({ tags: payloadTags })
      .eq("id", p.id);

    if (error) {
      // Try fallback: if we guessed array but DB expects string.
      if (typeof payloadTags !== "string") {
        const fallback = newTags.join(", ");
        const { error: error2 } = await supabase
          .from(table)
          .update({ tags: fallback })
          .eq("id", p.id);

        if (error2) {
          throw new Error(`Update failed for id=${p.id}: ${error2.message}`);
        }
      } else {
        throw new Error(`Update failed for id=${p.id}: ${error.message}`);
      }
    }

    updated++;
  }

  console.log("\n=== Apply complete ===");
  console.log(`Tabela: ${table}`);
  console.log(`Pontos varridos: ${scanned}`);
  console.log(`Pontos atualizados: ${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
