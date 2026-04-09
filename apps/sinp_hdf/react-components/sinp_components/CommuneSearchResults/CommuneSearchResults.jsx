import React, { useEffect, useState } from "react";

const TAB_IDS = {
  OBSERVATIONS: "observations",
  STATISTIQUES: "statistiques",
  INFORMATIONS: "informations",
};

const getFeatureByUid = (layerId, featureUid) => {
  const source = window.mviewer?.customLayers?.[layerId]?.layer?.getSource?.();
  const features = source?.getFeatures?.() || [];

  return (
    features.find((feature) => String(feature?.ol_uid) === String(featureUid)) || null
  );
};

const getFeatureProperties = (feature) => {
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
    secondaryValue: (properties) => properties.code_insee || "-",
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

const getLayerConfig = (layerId) => {
  return LAYER_CONFIG[layerId] || LAYER_CONFIG.communeSearch;
};

const FeatureOverview = ({ properties = {}, config }) => {
  const rows = [
    { label: config.primaryLabel, value: config.primaryValue(properties) },
    { label: config.secondaryLabel, value: config.secondaryValue(properties) },
    { label: config.countLabel, value: properties.nb_observations ?? "-" },
  ];

  return (
    <>
      {config.note ? <p className="mv-csr-note">{config.note}</p> : null}
      <div className="mv-csr-card-grid">
        {rows.map((row) => (
          <div key={row.label} className="mv-csr-card">
            <div className="mv-csr-card-label">{row.label}</div>
            <div className="mv-csr-card-value">{row.value}</div>
          </div>
        ))}
      </div>
    </>
  );
};

const ObservationTable = ({ details = [] }) => {
  if (!details.length) {
    return <p className="mv-csr-empty">Aucune observation détaillée disponible.</p>;
  }

  return (
    <div className="table-responsive mv-csr-table-wrapper">
      <table className="table table-striped table-hover mv-csr-table">
        <thead>
          <tr>
            <th>Groupe taxonomique</th>
            <th>Espèce observée</th>
            <th>Dernière observation</th>
            <th>Nb. observations</th>
          </tr>
        </thead>
        <tbody>
          {details.map((detail, index) => (
            <tr key={`${detail?.commune_id || "detail"}-${detail?.nom_valide || index}`}>
              <td>{detail?.groupe_taxo || "-"}</td>
              <td>
                <div>{detail?.nom_vern || "-"}</div>
                <div className="mv-csr-latin-name">{detail?.nom_valide || ""}</div>
              </td>
              <td>{detail?.last_date_obs || "-"}</td>
              <td>{detail?.nb_observations ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DetailFields = ({ properties = {} }) => {
  const entries = Object.entries(properties).filter(([key, value]) => {
    return (
      key !== "details" &&
      key !== "geometry" &&
      key !== "fields_kv" &&
      key !== "serialized" &&
      typeof value !== "function" &&
      typeof value !== "object"
    );
  });

  if (!entries.length) {
    return <p className="mv-csr-empty">Aucune information complémentaire disponible.</p>;
  }

  return (
    <dl className="mv-csr-detail-list">
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>{key}</dt>
          <dd>{String(value ?? "-")}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

const CommuneSearchResults = ({ layerId, featureUid }) => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.OBSERVATIONS);
  const [feature, setFeature] = useState(() => getFeatureByUid(layerId, featureUid));

  useEffect(() => {
    setFeature(getFeatureByUid(layerId, featureUid));
  }, [layerId, featureUid]);

  const layerConfig = getLayerConfig(layerId);
  const properties = getFeatureProperties(feature);
  const details = Array.isArray(properties.details) ? properties.details : [];

  if (!feature) {
    return <p className="mv-csr-empty">Impossible de retrouver la feature demandée.</p>;
  }

  return (
    <div className="mv-csr-root">
      <style>{`
        .mv-csr-root {
          display: flex;
          flex-direction: column;
          width: 100%;
          min-height: 100%;
          gap: 12px;
        }

        .mv-csr-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #d8d8d8;
          padding-bottom: 8px;
          flex-wrap: wrap;
        }

        .mv-csr-tab {
          border: 1px solid #d8d8d8;
          background: #f7f7f7;
          color: #4b5563;
          padding: 8px 12px;
          border-radius: 6px 6px 0 0;
          cursor: pointer;
          font-weight: 600;
        }

        .mv-csr-tab.is-active {
          background: #ffffff;
          color: #0b3a6e;
          border-bottom-color: #ffffff;
        }

        .mv-csr-panel {
          min-height: 200px;
          overflow: auto;
        }

        .mv-csr-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .mv-csr-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          background: linear-gradient(180deg, #fbfcfe 0%, #f3f6fa 100%);
        }

        .mv-csr-card-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .mv-csr-card-value {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }

        .mv-csr-note {
          margin: 0;
          padding: 12px 14px;
          border-left: 4px solid #0b3a6e;
          background: #eef4fb;
          color: #23415f;
          border-radius: 6px;
        }

        .mv-csr-table-wrapper {
          max-height: 400px;
          overflow: auto;
          border: none;
        }

        .mv-csr-table thead th {
          position: sticky;
          top: 0;
          background: #eef3f8;
          z-index: 1;
        }

        .mv-csr-latin-name {
          font-style: italic;
          color: #5b6470;
        }

        .mv-csr-detail-list {
          display: grid;
          grid-template-columns: minmax(140px, 220px) 1fr;
          gap: 8px 16px;
          align-items: start;
          margin: 0;
        }

        .mv-csr-detail-list dt {
          font-weight: 700;
          color: #374151;
        }

        .mv-csr-detail-list dd {
          margin: 0;
          color: #111827;
          word-break: break-word;
        }

        .mv-csr-empty {
          margin: 0;
          padding: 16px;
          border: 1px dashed #c7d2df;
          border-radius: 8px;
          background: #f8fbff;
          color: #475569;
        }
      `}</style>

      <div className="mv-csr-tabs" role="tablist" aria-label={layerConfig.panelLabel}>
        <button
          type="button"
          className={`mv-csr-tab ${
            activeTab === TAB_IDS.OBSERVATIONS ? "is-active" : ""
          }`}
          onClick={() => setActiveTab(TAB_IDS.OBSERVATIONS)}>
          Taxon observé
        </button>
        <button
          type="button"
          className={`mv-csr-tab ${
            activeTab === TAB_IDS.STATISTIQUES ? "is-active" : ""
          }`}
          onClick={() => setActiveTab(TAB_IDS.STATISTIQUES)}>
          Jeu de données
        </button>
        <button
          type="button"
          className={`mv-csr-tab ${
            activeTab === TAB_IDS.INFORMATIONS ? "is-active" : ""
          }`}
          onClick={() => setActiveTab(TAB_IDS.INFORMATIONS)}>
          Détail des données
        </button>
      </div>

      <div className="mv-csr-panel">
        {activeTab === TAB_IDS.OBSERVATIONS && <ObservationTable details={details} />}
        {activeTab === TAB_IDS.STATISTIQUES && (
          <FeatureOverview properties={properties} config={layerConfig} />
        )}
        {activeTab === TAB_IDS.INFORMATIONS && <DetailFields properties={properties} />}
      </div>
    </div>
  );
};

export default CommuneSearchResults;
