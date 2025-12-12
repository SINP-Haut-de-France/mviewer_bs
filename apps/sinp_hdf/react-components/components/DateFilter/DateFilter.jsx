import React, { useState, useEffect } from 'react';
import DateFilterUI from './DateFilterUI';
import { format, isValid } from 'date-fns';

const DateFilter = ({
  libelle = 'Période',
  dateDeb = '',
  dateFin = '',
  defaultNbYears = 20,
  outputFormat = 'yyyy-MM-dd',
  onChange
}) => {
  const today = new Date();

  // Calcul des dates par défaut
  const defaultStartDate = dateDeb || format(new Date(today.setFullYear(today.getFullYear() - defaultNbYears)), outputFormat);
  const defaultEndDate = dateFin || format(new Date(), outputFormat);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Notify parent component on mount
  useEffect(() => {
    if (onChange) {
      onChange({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      });
    }
  }, [defaultStartDate, defaultEndDate, onChange]);

  const handleStartDateChange = (newStartDate) => {
    if (isValid(new Date(newStartDate))) {
      setStartDate(newStartDate);
      if (onChange) {
        onChange({
          startDate: newStartDate,
          endDate,
        });
      }
    }
  };

  const handleEndDateChange = (newEndDate) => {
    if (isValid(new Date(newEndDate))) {
      setEndDate(newEndDate);
      if (onChange) {
        onChange({
          startDate,
          endDate: newEndDate,
        });
      }
    }
  };

  return (
    <DateFilterUI
      libelle={libelle}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={handleStartDateChange}
      onEndDateChange={handleEndDateChange}
    />
  );
};

export default DateFilter;