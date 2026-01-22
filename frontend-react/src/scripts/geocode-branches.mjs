import fs from "node:fs/promises";
import path from "node:path";

// ====== הגדרות ======
const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY; // אם כבר יש לך ב-.env

// אתה אמרת שהקובץ אצלך הוא JSON של האזורים/סניפים
const INPUT_PATH = path.resolve("src/data/branches.json");

// כדי לא לדרוס את המקור – נוציא קובץ חדש
const OUTPUT_PATH = path.resolve("src/data/branches.withLatLng.json");

if (!API_KEY) {
  console.error(
    "Missing API key. Set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY in your environment."
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?" +
    new URLSearchParams({
      address: `${address}, ישראל`,
      key: API_KEY,
      region: "il",
      language: "he",
    });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    return { ok: false, status: data.status };
  }

  const best = data.results[0];
  const loc = best?.geometry?.location;

  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { ok: false, status: "NO_LOCATION" };
  }

  return {
    ok: true,
    lat: loc.lat,
    lng: loc.lng,
    formatted_address: best.formatted_address,
    place_id: best.place_id,
  };
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const regions = JSON.parse(raw);

  const cache = new Map();

  let total = 0;
  let filled = 0;
  let failed = 0;

  for (const region of regions) {
    for (const branch of region.branches) {
      total++;

      // אם כבר קיים lat/lng - לא נוגעים
      if (typeof branch.lat === "number" && typeof branch.lng === "number") {
        filled++;
        continue;
      }

      const addr = String(branch.address || "").trim();
      if (!addr) {
        branch._geocodeError = "MISSING_ADDRESS";
        failed++;
        continue;
      }

      if (!cache.has(addr)) {
        await sleep(150); // ריסון קטן

        try {
          cache.set(addr, await geocode(addr));
        } catch (e) {
          cache.set(addr, { ok: false, status: "FETCH_ERROR", error: String(e) });
        }
      }

      const r = cache.get(addr);

      if (r?.ok) {
        branch.lat = r.lat;
        branch.lng = r.lng;

        // אופציונלי (עוזר לדיבאג): אפשר למחוק אחרי שהכל תקין
        branch._formattedAddress = r.formatted_address;
        branch._placeId = r.place_id;

        filled++;
      } else {
        branch._geocodeError = r?.status || "UNKNOWN_ERROR";
        failed++;
      }
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(regions, null, 2), "utf8");

  console.log("Done ✅");
  console.log({ total, filled, failed });
  console.log("Output:", OUTPUT_PATH);
  console.log("Tip: חפש בקובץ את '_geocodeError' כדי לתקן כתובות בעייתיות.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
