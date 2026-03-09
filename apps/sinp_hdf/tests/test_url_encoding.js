/**
 * Test de l'encodage VIEWPARAMS complet
 * Vérifie que le pipe (|) est correctement encodé en %7C dans l'URL
 */

// Simulation du VIEWPARAMS produit par sinpQueryBuilder
const viewparams = "DATE_DEB:2006-03-09;DATE_FIN:2026-03-09;CD_REF:;GRP_IDS:13|15";
console.log("VIEWPARAMS brut:", viewparams);

// Encodage avec encodeURIComponent (comme dans les customlayers)
const encodedViewparams = encodeURIComponent(viewparams);
console.log("VIEWPARAMS encodé:", encodedViewparams);

// Vérifications
console.log("\n✅ Vérifications:");
console.log("  Pipe encodé en %7C?", encodedViewparams.includes("%7C"));
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

// Vérification que le pipe est encodé
console.log("\n✅ Résultat final:");
if (fullUrl.includes("GRP_IDS%3A13%7C15")) {
  console.log("✅ OK - Pipe encodé correctement en %7C");
} else if (fullUrl.includes("GRP_IDS:13|15")) {
  console.log("❌ ERREUR - Pipe n'est pas encodé (manque %7C)");
} else {
  console.log("❓ UNKNOWN - Format GRP_IDS non trouvé");
}

