export const TAB_IDS = {
  OBSERVATIONS: "observations",
  DATASETS: "datasets",
  INFORMATIONS: "informations",
};

export const SELECTION_PROMPT_MESSAGE =
  "Sélectionnez une entité sur la carte pour afficher le détail.";

const DATASET_METADATA_IDENTIFIER_KEYS = [
  "uuidJdd",
  "uuid_jdd",
  "uuidJDD",
  "jddUuid",
  "jdd_uuid",
  "uuidJeuDonnees",
  "uuidJeuDeDonnees",
  "uuid_jeu_donnees",
  "uuidMetadonneeJdd",
  "uuidMetadataJdd",
  "metadataUuidJdd",
  "fileIdentifierJdd",
  "file_identifier_jdd",
  "jddFileIdentifier",
  "nomFichierJdd",
  "nom_fichier_jdd",
  "uuidMetadata",
  "uuidMetadonnee",
  "metadataUuid",
  "fileIdentifier",
  "file_identifier",
  "nomFichier",
  "nom_fichier",
  "uuid",
];

const ACQUISITION_FRAME_METADATA_IDENTIFIER_KEYS = [
  "uuidCA",
  "uuid_ca",
  "caUuid",
  "ca_uuid",
  "uuidCadreAcquisition",
  "uuid_cadre_acquisition",
  "uuidMetadonneeCA",
  "uuidMetadataCA",
  "metadataUuidCA",
  "fileIdentifierCA",
  "file_identifier_ca",
  "caFileIdentifier",
  "nomFichierCA",
  "nom_fichier_ca",
  "uuidMetadata",
  "uuidMetadonnee",
  "metadataUuid",
  "fileIdentifier",
  "file_identifier",
  "nomFichier",
  "nom_fichier",
  "uuid",
];

const getFirstDefinedValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
};

export const getFeatureByUid = (layerId, featureUid) => {
  const source = window.mviewer?.customLayers?.[layerId]?.layer?.getSource?.();
  const features = source?.getFeatures?.() || [];

  return (
    features.find((feature) => String(feature?.ol_uid) === String(featureUid)) || null
  );
};

export const getFeatureProperties = (feature) => {
  if (!feature?.getProperties) {
    return {};
  }

  return feature.getProperties() || {};
};

const LAYER_CONFIG = {
  communeSearch: {
    panelLabel: "Détails de la commune",
    primaryLabel: "Commune",
    primaryValue: (properties) =>
      properties.commune_name || properties.nom_commune || "-",
    secondaryLabel: "Code INSEE",
    secondaryValue: (properties) => properties.code_insee || properties.code || "-",
    countLabel: "Nombre d'observations",
    note: null,
  },
  gridSearch5x5: {
    panelLabel: "Détails de la maille 5x5",
    primaryLabel: "Maille 5x5",
    primaryValue: (properties) =>
      properties.code_maille || properties.id_maille || properties.maille || "-",
    secondaryLabel: "Système de grille",
    secondaryValue: () => "5 x 5 km",
    countLabel: "Nombre d'observations agrégées",
    note: "Les résultats sont destinés à être agrégés sur la grille 5 x 5 km à l'échelle des Hauts-de-France.",
  },
  grid10x10search: {
    panelLabel: "Détails de la maille 10x10",
    primaryLabel: "Maille 10x10",
    primaryValue: (properties) =>
      properties.code_maille || properties.id_maille || properties.maille || "-",
    secondaryLabel: "Système de grille",
    secondaryValue: () => "10 x 10 km",
    countLabel: "Nombre d'observations agrégées",
    note: "Les résultats sont destinés à être agrégés sur la grille 10 x 10 km à l'échelle des Hauts-de-France.",
  },
};

export const getLayerConfig = (layerId) => {
  return LAYER_CONFIG[layerId] || LAYER_CONFIG.communeSearch;
};

export const normalizeManager = (item = {}) => {
  const manager = getFirstDefinedValue(item.organisme, item.identite);
  return manager ? String(manager) : "-";
};

export const getMetadataBaseUrl = () => {
  return (
    window.mviewer?.env?.[window.mviewer?.env?.CURRENT_ENV]
      ?.GEONETWORK_METADATA_BASE_URL || null
  );
};

export const buildMetadataUrl = (baseUrl, metadataIdentifier) => {
  const normalizedBaseUrl =
    typeof baseUrl === "string" && baseUrl.trim() !== ""
      ? baseUrl.trim().replace(/\/+$/, "")
      : null;
  const normalizedIdentifier =
    metadataIdentifier !== undefined &&
    metadataIdentifier !== null &&
    String(metadataIdentifier).trim() !== ""
      ? String(metadataIdentifier).trim()
      : null;

  if (!normalizedBaseUrl || !normalizedIdentifier) {
    return null;
  }

  return `${normalizedBaseUrl}/${encodeURIComponent(normalizedIdentifier)}`;
};

const getMetadataIdentifier = (item = {}, keys = []) => {
  return getFirstDefinedValue(...keys.map((key) => item?.[key]));
};

export const paginateItems = (items = [], pageSize, page) => {
  if (pageSize === "all") {
    return items;
  }

  const size = Number(pageSize);
  const startIndex = (page - 1) * size;
  return items.slice(startIndex, startIndex + size);
};

export const getTotalPages = (items = [], pageSize) => {
  if (pageSize === "all") {
    return 1;
  }

  const size = Number(pageSize);
  return Math.max(1, Math.ceil(items.length / size));
};

export const formatPageSizeValue = (value) => {
  return value === "all" ? "all" : String(value);
};

export const parsePageSizeValue = (value) => {
  return value === "all" ? "all" : Number(value);
};

export const groupJddDetails = (details = []) => {
  const groups = new Map();

  details.forEach((detail, index) => {
    const caSourceId = getFirstDefinedValue(detail.idCA);
    const caId = getFirstDefinedValue(caSourceId, detail.libelCA, `ca-${index}`);
    const caKey = String(caId);
    const caLabel = getFirstDefinedValue(
      detail.libelCA,
      "Cadre d'acquisition non renseigné"
    );
    const datasetSourceId = getFirstDefinedValue(detail.idJdd);
    const datasetId = getFirstDefinedValue(
      datasetSourceId,
      detail.libelJdd,
      `jdd-${index}`
    );
    const datasetKey = String(datasetId);
    const datasetLabel = getFirstDefinedValue(
      detail.libelJdd,
      "Jeu de données non renseigné"
    );

    if (!groups.has(caKey)) {
      groups.set(caKey, {
        key: caKey,
        idCA: caSourceId ? String(caSourceId) : null,
        libelCA: String(caLabel),
        metadataId: getMetadataIdentifier(
          detail,
          ACQUISITION_FRAME_METADATA_IDENTIFIER_KEYS
        ),
        identites: new Set(),
        organismes: new Set(),
        datasets: new Map(),
      });
    }

    const group = groups.get(caKey);
    if (detail.identite) {
      group.identites.add(String(detail.identite));
    }
    if (detail.organisme) {
      group.organismes.add(String(detail.organisme));
    }

    if (!group.datasets.has(datasetKey)) {
      group.datasets.set(datasetKey, {
        key: datasetKey,
        idJdd: datasetSourceId ? String(datasetSourceId) : null,
        libelJdd: String(datasetLabel),
        metadataId: getMetadataIdentifier(detail, DATASET_METADATA_IDENTIFIER_KEYS),
        identites: new Set(),
        organismes: new Set(),
      });
    }

    const dataset = group.datasets.get(datasetKey);
    if (detail.identite) {
      dataset.identites.add(String(detail.identite));
    }
    if (detail.organisme) {
      dataset.organismes.add(String(detail.organisme));
    }
  });

  return Array.from(groups.values()).map((group) => ({
    key: group.key,
    idCA: group.idCA,
    libelCA: group.libelCA,
    metadataId: group.metadataId,
    identite: group.identites.size ? Array.from(group.identites).join(" / ") : "",
    organisme: group.organismes.size ? Array.from(group.organismes).join(" / ") : "",
    datasets: Array.from(group.datasets.values()).map((dataset) => ({
      key: dataset.key,
      idJdd: dataset.idJdd,
      libelJdd: dataset.libelJdd,
      metadataId: dataset.metadataId,
      identite: dataset.identites.size ? Array.from(dataset.identites).join(" / ") : "",
      organisme: dataset.organismes.size ? Array.from(dataset.organismes).join(" / ") : "",
    })),
  }));
};

export const getTableWrapperStyle = (rowCount, options = {}) => {
  const {
    headerHeight = 34,
    rowHeight = 34,
    maxHeight = "calc(100vh - 260px)",
  } = options;

  if (!rowCount || rowCount <= 0) {
    return {};
  }

  const contentHeight = headerHeight + rowCount * rowHeight;

  return {
    maxHeight: `min(${maxHeight}, ${contentHeight}px)`,
  };
};
