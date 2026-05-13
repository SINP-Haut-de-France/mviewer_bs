import { format, isValid, parseISO } from "date-fns";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:Z)?$/;

export const parseDateValue = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const normalizedValue = String(value).trim();
  const dateOnlyMatch = normalizedValue.match(DATE_ONLY_PATTERN);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsedIsoDate = parseISO(normalizedValue);
  if (isValid(parsedIsoDate)) {
    return parsedIsoDate;
  }

  const parsedDate = new Date(normalizedValue);
  return isValid(parsedDate) ? parsedDate : null;
};

export const formatDisplayDate = (
  value,
  { fallback = "-", outputFormat = "dd-MM-yyyy" } = {}
) => {
  const parsedDate = parseDateValue(value);
  return parsedDate ? format(parsedDate, outputFormat) : fallback;
};
