// Insert thousands separators into the numeric portion of a value while
// leaving any trailing currency/text intact. Works on raw numbers (191310),
// the backend's pre-formatted "191310 USD" strings, and decimals
// ("85857.48 USD"). Hermes doesn't group reliably via toLocaleString, so the
// grouping is done manually. Idempotent — re-formatting an already grouped
// string ("191,310 USD") leaves it unchanged.
export const formatAmount = value => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\d[\d,]*(\.\d+)?/, match => {
    const [intPart, decPart] = match.replace(/,/g, '').split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart != null ? `${grouped}.${decPart}` : grouped;
  });
};

// Sanitize raw amount-field keystrokes into a grouped display string: strips
// anything that isn't a digit or a decimal point (so letters/symbols can't be
// entered even from a hardware keyboard or paste), keeps a single decimal
// point, and groups the integer part with commas. Pair with parseAmount for
// the numeric value — e.g. "1,000,000" stays "1,000,000" on screen but parses
// to 1000000 instead of NaN.
export const sanitizeAmountInput = text => {
  if (text === null || text === undefined) {
    return '';
  }
  let cleaned = String(text).replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    // keep only the first decimal point
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  const [intPart, decPart] = cleaned.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${groupedInt}.${decPart}` : groupedInt;
};

// Parse an amount string (possibly comma-grouped) into a finite number, or 0.
export const parseAmount = text => {
  const n = Number(String(text ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
