import {
  COVERAGE_RATE_MIN,
  COVERAGE_RATE_MAX,
  DEFAULT_COVERAGE_RATE,
} from "./filtersConfig";

/**
 * Paramètres applicatifs stockés en base (sinp_core.sinp_env_variables) et
 * exposés par la couche GeoServer v_sinp_configuration (colonnes id, code, value).
 * Chargés une fois au démarrage (main.jsx) puis conservés en mémoire jusqu'au
 * prochain rafraîchissement de la page.
 */
export const SINP_CONFIGURATION_TYPENAME = "sinp_diffusion:v_sinp_configuration";

let configuration = {};

const parseValue = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  // Les URL sont conservées telles quelles, les nombres sont convertis
  return trimmed !== "" && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
};

export const loadSinpConfiguration = async () => {
  const geoserverUrl = window.mviewer?.env?.[window.mviewer?.env?.CURRENT_ENV]
    ?.GEOSERVER_BASE_URL;

  if (!geoserverUrl) {
    console.error("❌ GEOSERVER_BASE_URL absente : configuration SINP non chargée");
    return configuration;
  }

  const baseUrl = geoserverUrl.trim().replace(/\/+$/g, "").replace(/\/(?:ows|wfs|wms)$/i, "");
  const params = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAME: SINP_CONFIGURATION_TYPENAME,
    outputFormat: "application/json",
  });

  try {
    const response = await fetch(`${baseUrl}/wfs?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    configuration = (json.features || []).reduce((acc, { properties }) => {
      if (properties?.code) acc[properties.code] = parseValue(properties.value);
      return acc;
    }, {});

    window.sinpConfiguration = configuration;
    console.log("✅ Configuration SINP chargée", configuration);
  } catch (error) {
    console.error("❌ Erreur de chargement de la configuration SINP", error);
  }

  return configuration;
};

export const getSinpConfiguration = () => configuration;

export const getSinpConfigValue = (code, defaultValue = null) =>
  configuration[code] ?? defaultValue;

const toNumber = (value, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Bornes (%) du slider du mode « équilibré », avec repli sur les valeurs
 * par défaut si la configuration est indisponible ou incohérente.
 */
export const getCoverageRateBounds = () => {
  const min = toNumber(configuration.INCLUSION_EQUILIBRE_MIN, COVERAGE_RATE_MIN);
  const max = toNumber(configuration.INCLUSION_EQUILIBRE_MAX, COVERAGE_RATE_MAX);
  return min < max
    ? { min, max }
    : { min: COVERAGE_RATE_MIN, max: COVERAGE_RATE_MAX };
};

/** Valeur initiale du slider : INCLUSION_EQUILIBRE, ramenée dans les bornes. */
export const getDefaultCoverageRate = () => {
  const { min, max } = getCoverageRateBounds();
  const value = toNumber(configuration.INCLUSION_EQUILIBRE, DEFAULT_COVERAGE_RATE);
  return Math.min(max, Math.max(min, value));
};
