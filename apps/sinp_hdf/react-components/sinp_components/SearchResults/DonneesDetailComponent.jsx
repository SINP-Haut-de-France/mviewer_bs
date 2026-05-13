import React from "react";

const DonneesDetailComponent = ({
  properties = {},
  selectionPrompt = false,
  selectionPromptMessage = "",
}) => {
  const entries = Object.entries(properties).filter(([key, value]) => {
    return (
      key !== "details" &&
      key !== "jdd_details" &&
      key !== "entity_data_loaded" &&
      key !== "geometry" &&
      key !== "fields_kv" &&
      key !== "serialized" &&
      typeof value !== "function" &&
      typeof value !== "object"
    );
  });

  if (selectionPrompt) {
    return <p className="mv-sr-empty">{selectionPromptMessage}</p>;
  }

  if (!entries.length) {
    return <p className="mv-sr-empty">Aucune information complémentaire disponible.</p>;
  }

  return (
    <dl className="mv-sr-detail-list">
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>{key}</dt>
          <dd>{String(value ?? "-")}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

export default DonneesDetailComponent;
