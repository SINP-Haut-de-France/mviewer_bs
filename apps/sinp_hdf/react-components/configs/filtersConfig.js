/**
 * Configuration centralisée des filtres SINP
 * Définit quels filtres sont disponibles pour chaque contexte métier
 */

export const FILTER_TYPES = {
  TAXON: 'taxon',
  DATE: 'date',
  DEPARTMENT: 'department',
  COMMUNE: 'commune',
  EPCI: 'epci',
  TAXONOMIC_GROUP: 'taxonomicGroup',
};

/**
 * Profils de filtres prédéfinis pour différents contextes métiers
 */
export const FILTER_PROFILES = {
  // Profil complet : tous les filtres disponibles
  FULL: {
    name: 'Complet',
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.DATE,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.COMMUNE,
      FILTER_TYPES.EPCI,
      FILTER_TYPES.TAXONOMIC_GROUP,
    ],
  },

  // Profil temporel : uniquement les filtres de date et taxonomie
  TEMPORAL: {
    name: 'Analyse temporelle',
    filters: [
      FILTER_TYPES.DATE,
      FILTER_TYPES.TAXONOMIC_GROUP,
    ],
  },

  // Profil géographique : filtres géo sans taxon
  GEOGRAPHIC: {
    name: 'Recherche géographique',
    filters: [
      FILTER_TYPES.DATE,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.COMMUNE,
      FILTER_TYPES.EPCI,
    ],
  },

  // Profil taxonomique : focus sur les groupes et espèces
  TAXONOMIC: {
    name: 'Recherche taxonomique',
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.TAXONOMIC_GROUP,
      FILTER_TYPES.DATE,
    ],
  },

  GEOMETRY_OBSERVATIONS: {
    name: 'Observations dans le zonage',
    allowSubmitWithoutActiveFilters: true,
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.TAXONOMIC_GROUP,
      FILTER_TYPES.DATE,
    ],
  },

  // Profil synthèse communale : pour la couche SOPC
  COMMUNE_SYNTHESIS: {
    name: 'Synthèse communale',
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.DATE,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.COMMUNE,
      FILTER_TYPES.EPCI,
      FILTER_TYPES.TAXONOMIC_GROUP,
    ],
  },

  // Profil observations détaillées
  DETAILED_OBSERVATIONS: {
    name: 'Observations détaillées',
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.DATE,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.COMMUNE,
      FILTER_TYPES.EPCI,
    ],
  },
};

/**
 * Configuration par défaut de chaque filtre
 */
export const FILTER_CONFIGS = {
  [FILTER_TYPES.TAXON]: {
    label: 'Taxon',
    icon: 'fa-leaf',
    required: false,
    tooltip: 'Rechercher une espèce spécifique',
  },
  [FILTER_TYPES.DATE]: {
    label: 'Période',
    icon: 'fa-calendar',
    required: true,
    tooltip: 'Définir la période d\'observation',
  },
  [FILTER_TYPES.DEPARTMENT]: {
    label: 'Département',
    icon: 'fa-map',
    required: false,
    tooltip: 'Filtrer par département',
  },
  [FILTER_TYPES.COMMUNE]: {
    label: 'Commune',
    icon: 'fa-map-pin',
    required: false,
    tooltip: 'Filtrer par commune (nécessite un département)',
    dependsOn: FILTER_TYPES.DEPARTMENT,
  },
  [FILTER_TYPES.EPCI]: {
    label: 'EPCI',
    icon: 'fa-city',
    required: false,
    tooltip: 'Filtrer par établissement public de coopération intercommunale',
  },
  [FILTER_TYPES.TAXONOMIC_GROUP]: {
    label: 'Groupe taxonomique',
    icon: 'fa-sitemap',
    required: false,
    tooltip: 'Sélectionner un ou plusieurs groupes d\'espèces',
  },
};

/**
 * Mapping des couches mviewer vers les profils de filtres
 */
export const LAYER_FILTER_PROFILES = {
  'communeSearch': FILTER_PROFILES.FULL,
  'advancedSearch': FILTER_PROFILES.FULL,
  'gridSearch5x5': FILTER_PROFILES.FULL,
  'grid10x10search': FILTER_PROFILES.FULL,
  'gridSearch10x10': FILTER_PROFILES.FULL,
  'obs_detaillees': FILTER_PROFILES.DETAILED_OBSERVATIONS,
  'repartition_temporelle': FILTER_PROFILES.TEMPORAL,
  'mailles': FILTER_PROFILES.GEOGRAPHIC,
  // Ajouter d'autres mappings selon vos couches
};

export const SEARCH_RESTITUTION_LAYERS = [
  {
    id: 'communeSearch',
    label: 'Communes',
    targetLocCode: '2',
  },
  {
    id: 'gridSearch5x5',
    label: 'Grille 5x5',
    targetLocCode: '7',
  },
  {
    id: 'grid10x10search',
    label: 'Grille 10x10',
    targetLocCode: '6',
  },
  {
    id: 'selection',
    label: 'Zonage complet',
    selectionOnly: true,
  },
];

/**
 * Niveaux de précision de la recherche par sélection de zonage.
 * Le niveau « balanced » ouvre un taux de recouvrement personnalisable.
 */
export const PRECISION_LEVELS = [
  { id: 'exhaustive', label: 'Partiellement inclus' },
  { id: 'balanced', label: 'Inclusion personnalisée' },
  { id: 'strict', label: 'Totalement inclus' },
];
export const DEFAULT_PRECISION_LEVEL = 'exhaustive';
export const COVERAGE_RATE_MIN = 80;
export const COVERAGE_RATE_MAX = 100;
export const DEFAULT_COVERAGE_RATE = 90;

/**
 * Valeur attendue par la fonction PostgreSQL (paramètre `precision` du
 * context_params jsonb) pour chaque niveau de précision de l'UI.
 */
export const PRECISION_LEVEL_VALUES = {
  exhaustive: 'exhaustif',
  balanced: 'equilibre',
  strict: 'strict',
};

/**
 * Distance (en mètres) du buffer appliqué à la géométrie de recherche
 * lorsque la case « Utiliser un buffer » est cochée.
 */
export const BUFFER_DISTANCE_METERS = 500;

export const getEnvironmentalSelectionLayers = () => {
  const configuredLayers = window.mviewer?.env?.EXTERNAL_LAYERS_OBS;

  if (!Array.isArray(configuredLayers)) {
    console.error(
      "La configuration EXTERNAL_LAYERS_OBS est absente de sinp_hdf.json."
    );
    return [];
  }

  return configuredLayers
    .filter(
      (layer) =>
        layer &&
        typeof layer.id === "string" &&
        layer.id.trim() !== "" &&
        typeof layer.label === "string" &&
        layer.label.trim() !== ""
    )
    .map(({ id, label }) => ({
      id: id.trim(),
      label: label.trim(),
    }));
};

const SEARCH_LAYER_PRIORITY = [
  'communeSearch',
  'gridSearch5x5',
  'grid10x10search',
  'advancedSearch',
];

/**
 * Obtient le profil de filtres pour une couche donnée
 * @param {string} layerId - Identifiant de la couche mviewer
 * @returns {Object} - Profil de filtres
 */
export const getFilterProfileForLayer = (layerId) => {
  return LAYER_FILTER_PROFILES[layerId] || FILTER_PROFILES.FULL;
};

export const resolveSearchLayerId = (preferredLayerId = null) => {
  const customLayers = window.mviewer?.customLayers || {};
  const configuredLayers = window.mviewer?.getLayers?.() || {};

  if (preferredLayerId && customLayers[preferredLayerId]) {
    return preferredLayerId;
  }

  const visibleLayerId = SEARCH_LAYER_PRIORITY.find((layerId) => {
    return customLayers[layerId] && configuredLayers[layerId]?.layer?.getVisible?.();
  });

  if (visibleLayerId) {
    return visibleLayerId;
  }

  return SEARCH_LAYER_PRIORITY.find((layerId) => customLayers[layerId]) || null;
};

export const getSearchLayer = (preferredLayerId = null) => {
  const resolvedLayerId = resolveSearchLayerId(preferredLayerId);

  if (!resolvedLayerId) {
    return null;
  }

  return window.mviewer?.customLayers?.[resolvedLayerId] || null;
};

export const getVisibleEnvironmentalLayers = () => {
  const configuredLayers = window.mviewer?.getLayers?.() || {};

  return getEnvironmentalSelectionLayers().filter(({ id }) =>
    configuredLayers[id]?.layer?.getVisible?.()
  );
};

/**
 * Déploie dans le menu de gauche la thématique (et le groupe) qui contient les
 * couches de zonage utilisables pour la recherche par sélection, afin que
 * l'utilisateur puisse les afficher sans chercher dans le menu.
 */
export const expandEnvironmentalLayersMenu = () => {
  const layerIds = getEnvironmentalSelectionLayers().map(({ id }) => id);
  const layerItem = layerIds
    .map((id) =>
      document.querySelector(`#menu li.mv-nav-item[data-layerid="${id}"]`)
    )
    .find(Boolean);
  const themeItem = layerItem?.closest('li[id^="theme-layers-"]');

  if (!themeItem) {
    return;
  }

  const isOpen = (item) => item?.querySelector(':scope > ul')?.offsetParent !== null;
  const open = (item) => item?.querySelector(':scope > a')?.click();

  if (!isOpen(themeItem)) {
    open(themeItem);
  }

  const groupItem = layerItem.closest('li.level-2');
  if (groupItem && !isOpen(groupItem)) {
    open(groupItem);
  }
};

export const subscribeToEnvironmentalLayerVisibility = (onChange) => {
  let subscriptions = [];

  const unbind = () => {
    subscriptions.forEach(({ layer, handler }) => {
      layer.un("change:visible", handler);
    });
    subscriptions = [];
  };

  const bind = () => {
    unbind();
    const configuredLayers = window.mviewer?.getLayers?.() || {};
    subscriptions = getEnvironmentalSelectionLayers().map(({ id }) => {
      const layer = configuredLayers[id]?.layer;
      if (!layer?.on || !layer?.un) {
        return null;
      }

      const handler = () => onChange(getVisibleEnvironmentalLayers());
      layer.on("change:visible", handler);
      return { layer, handler };
    }).filter(Boolean);

    onChange(getVisibleEnvironmentalLayers());
  };

  bind();
  document.addEventListener("map-ready", bind);
  return () => {
    document.removeEventListener("map-ready", bind);
    unbind();
  };
};

/**
 * Vérifie si un filtre est visible dans un profil donné
 * @param {string} filterType - Type de filtre
 * @param {Object} profile - Profil de filtres
 * @returns {boolean}
 */
export const isFilterVisible = (filterType, profile) => {
  return profile.filters.includes(filterType);
};
