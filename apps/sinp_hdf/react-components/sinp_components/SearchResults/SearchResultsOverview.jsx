import React from "react";

const SearchResultsOverview = ({ properties = {}, config }) => {
  const rows = [
    { label: config.primaryLabel, value: config.primaryValue(properties) },
    { label: config.secondaryLabel, value: config.secondaryValue(properties) },
    { label: config.countLabel, value: properties.nb_observations ?? "-" },
  ];

  return (
    <>
      {config.note ? <p className="mv-sr-note">{config.note}</p> : null}
      <div className="mv-sr-card-grid">
        {rows.map((row) => (
          <div key={row.label} className="mv-sr-card">
            <div className="mv-sr-card-label">{row.label}</div>
            <div className="mv-sr-card-value">{row.value}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SearchResultsOverview;
