import React from "react";
import { formatDisplayDate } from "../../utils/date.utils";

const EntityCard = ({ label = "", cardData = null, loading = false }) => {
  if (!cardData) return null;

  return (
    <div className="card mv-sr-entity-card" aria-live="polite">
      {label ? <div className="card-header">{label}</div> : null}
      <ul className="list-group list-group-flush">
        <li className="list-group-item">
          Date de la dernière observation :{" "}
          <strong>{formatDisplayDate(cardData.lastObservationDate)}</strong>
        </li>
        <li className="list-group-item">
          Nb d'évènements concernés : <strong>{cardData.eventCount}</strong>
        </li>
        <li className="list-group-item">
          Nb d'observations total :{" "}
          <strong>{loading ? "…" : cardData.observationCount}</strong>
        </li>
      </ul>
    </div>
  );
};

export default EntityCard;
