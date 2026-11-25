export const FEEXPAY_COUNTRIES = [
  {
    code: "BJ",
    name: "Bénin",
    callingCode: "229",
    operators: [
      { value: "mtn", label: "MTN" },
      { value: "moov", label: "Moov" },
      { value: "celtiis_bj", label: "Celtiis" },
      { value: "coris", label: "Coris" },
      { value: "bmo", label: "B-MO" },
    ],
  },
  {
    code: "BF",
    name: "Burkina Faso",
    callingCode: "226",
    operators: [
      { value: "orange_bf", label: "Orange" },
      { value: "moov_bf", label: "Moov" },
      { value: "wave_bf", label: "Wave" },
    ],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    callingCode: "225",
    operators: [
      { value: "mtn_ci", label: "MTN" },
      { value: "moov_ci", label: "Moov" },
      { value: "orange_ci", label: "Orange" },
      { value: "wave_ci", label: "Wave" },
      { value: "djamo_ci", label: "Djamo" },
    ],
  },
  {
    code: "SN",
    name: "Sénégal",
    callingCode: "221",
    operators: [
      { value: "orange_sn", label: "Orange" },
      { value: "free_sn", label: "Free" },
      { value: "wave_sn", label: "Wave" },
    ],
  },
  {
    code: "TG",
    name: "Togo",
    callingCode: "228",
    operators: [
      { value: "moov_tg", label: "Moov" },
      { value: "togocom_tg", label: "Togocom" },
    ],
  },
  {
    code: "CG",
    name: "Congo-Brazzaville",
    callingCode: "242",
    operators: [{ value: "mtn_cg", label: "MTN" }],
  },
] as const;

export type FeexPayCountryCode = (typeof FEEXPAY_COUNTRIES)[number]["code"];
export type FeexPayOperator =
  (typeof FEEXPAY_COUNTRIES)[number]["operators"][number]["value"];

export const FEEXPAY_PAYMENT_METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte bancaire" },
] as const;

export type FeexPayPaymentMethod =
  (typeof FEEXPAY_PAYMENT_METHODS)[number]["value"];

export function isFeexPayCountry(value: unknown): value is FeexPayCountryCode {
  return FEEXPAY_COUNTRIES.some((country) => country.code === value);
}

export function getFeexPayCountry(
  value: unknown,
): (typeof FEEXPAY_COUNTRIES)[number] | null {
  return FEEXPAY_COUNTRIES.find((country) => country.code === value) ?? null;
}

export function isFeexPayOperator(
  countryCode: FeexPayCountryCode,
  value: unknown,
): value is FeexPayOperator {
  return (
    getFeexPayCountry(countryCode)?.operators.some(
      (operator) => operator.value === value,
    ) ?? false
  );
}

export function normalizeFeexPayPhoneNumber(
  value: string,
  countryCode: unknown,
): string | null {
  const country = getFeexPayCountry(countryCode);
  if (!country) return null;

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const international = trimmed.startsWith("00") ? digits.slice(2) : digits;
  const isInternational = trimmed.startsWith("+") || trimmed.startsWith("00");
  if (isInternational && !international.startsWith(country.callingCode)) {
    return null;
  }

  const national = international.startsWith(country.callingCode)
    ? international.slice(country.callingCode.length)
    : international;
  if (!/^\d{6,12}$/.test(national)) return null;
  return `${country.callingCode}${national}`;
}
