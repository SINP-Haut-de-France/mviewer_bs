import React from "react";
import { formatDisplayDate } from "../../utils/date.utils";

const SelectionSummary = ({ selectionSummary }) => {
  if (!selectionSummary) return null;

  return (
    <div className="mv-sr-selection-summary" aria-live="polite">
      <strong>Sélection courante :</strong> {selectionSummary.selectionLabel}
      <span className="mv-sr-selection-summary-separator" aria-hidden="true">-</span>
      <strong>Évènement(s) rattaché(s) :</strong> {selectionSummary.eventCount}
      <span className="mv-sr-selection-summary-separator" aria-hidden="true">-</span>
      <strong>Taxon(s) distinct(s) :</strong> {selectionSummary.taxonCount}
      <span className="mv-sr-selection-summary-separator" aria-hidden="true">-</span>
      <strong>Dernière observation :</strong>{" "}
      {formatDisplayDate(selectionSummary.lastObservationDate)}
    </div>
  );
};

export default SelectionSummary;
