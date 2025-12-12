/**
 * Configuration centralisée des filtres SINP
 * Définit quels filtres sont disponibles pour chaque contexte métier
 */

export const FILTER_TYPES = {
  TAXON: 'taxon',
  DATE: 'date',
  DEPARTMENT: 'department',
  COMMUNE: 'commune',
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

  // Profil synthèse communale : pour la couche SOPC
  COMMUNE_SYNTHESIS: {
    name: 'Synthèse communale',
    filters: [
      FILTER_TYPES.TAXON,
      FILTER_TYPES.DATE,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.COMMUNE,
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
  'advancedSearch': FILTER_PROFILES.FULL,
  'obs_detaillees': FILTER_PROFILES.DETAILED_OBSERVATIONS,
  'repartition_temporelle': FILTER_PROFILES.TEMPORAL,
  'mailles': FILTER_PROFILES.GEOGRAPHIC,
  // Ajouter d'autres mappings selon vos couches
};

/**
 * Obtient le profil de filtres pour une couche donnée
 * @param {string} layerId - Identifiant de la couche mviewer
 * @returns {Object} - Profil de filtres
 */
export const getFilterProfileForLayer = (layerId) => {
  return LAYER_FILTER_PROFILES[layerId] || FILTER_PROFILES.FULL;
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