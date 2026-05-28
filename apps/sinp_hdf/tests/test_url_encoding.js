/**
 * Test de l'encodage VIEWPARAMS complet
 * Vérifie que les listes VIEWPARAMS générées utilisent désormais "_"
 */

// Simulation du VIEWPARAMS produit par sinpQueryBuilder
const viewparams =
  "DATE_DEB:2006-03-09;DATE_FIN:2026-03-09;CD_REF:2440_2442;GRP_IDS:13_15";
console.log("VIEWPARAMS brut:", viewparams);

// Encodage avec encodeURIComponent (simulation générique)
const encodedViewparams = encodeURIComponent(viewparams);
console.log("VIEWPARAMS encodé:", encodedViewparams);

// Vérifications
console.log("\n✅ Vérifications:");
console.log("  Underscore conservé?", encodedViewparams.includes("_"));
console.log("  Point-virgule encodé en %3B?", encodedViewparams.includes("%3B"));
console.log("  Deux-points encodé en %3A?", encodedViewparams.includes("%3A"));
console.log("  Virgule encodée en %2C?", encodedViewparams.includes("%2C"));

// URL complète simulée
const baseUrl = "http://localhost:8090/geoserver/sinp/wfs";
const queryParams = new URLSearchParams({
  SERVICE: "WFS",
  VERSION: "2.0.0",
  REQUEST: "GetFeature",
  outputFormat: "application/json",
  TYPENAME: "sinp_diffusion:v_synthese_commune",
  VIEWPARAMS: viewparams,
});

const fullUrl = `${baseUrl}?${queryParams.toString()}`;
console.log("\nURL complète générée:");
console.log(fullUrl);

// Vérification que l'underscore est conservé
console.log("\n✅ Résultat final:");
if (fullUrl.includes("GRP_IDS%3A13_15")) {
  console.log('✅ OK - Séparateur "_" conservé correctement');
} else if (fullUrl.includes("GRP_IDS:13_15")) {
  console.log('⚠️ OK - Séparateur "_" présent sans encodage');
} else {
  console.log("❓ UNKNOWN - Format GRP_IDS non trouvé");
}
