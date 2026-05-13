import React from 'react';
import './DateFilter.css'; // Styles dédiés

const DateFilterUI = ({
  libelle,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  error
}) => {
  return (
    <div className="date-filter-container">
      <label className="date-filter-label">{libelle}</label>
      <div className="date-filter-inputs">
        <div className="date-filter-field">
          <label htmlFor="date-start">Date de début :</label>
          <input
            id="date-start"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div className="date-filter-field">
          <label htmlFor="date-end">Date de fin :</label>
          <input
            id="date-end"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="date-filter-error">{error}</p>}
    </div>
  );
};

export default DateFilterUI;