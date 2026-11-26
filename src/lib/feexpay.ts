export const FEEXPAY_COUNTRIES = [
  {
    code: "BJ",
    name: "Bénin",
    flag: "🇧🇯",
    callingCode: "229",
    nationalNumberLength: 10,
    phoneFormat: "+229 01 XX XX XX XX",
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
    flag: "🇧🇫",
    callingCode: "226",
    nationalNumberLength: 8,
    phoneFormat: "+226 XX XX XX XX",
    operators: [
      { value: "orange_bf", label: "Orange" },
      { value: "moov_bf", label: "Moov" },
      { value: "wave_bf", label: "Wave" },
    ],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    callingCode: "225",
    nationalNumberLength: 10,
    phoneFormat: "+225 XX XX XX XX XX",
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
    flag: "🇸🇳",
    callingCode: "221",
    nationalNumberLength: 9,
    phoneFormat: "+221 XX XXX XX XX",
    operators: [
      { value: "orange_sn", label: "Orange" },
      { value: "free_sn", label: "Free" },
      { value: "wave_sn", label: "Wave" },
    ],
  },
  {
    code: "TG",
    name: "Togo",
    flag: "🇹🇬",
    callingCode: "228",
    nationalNumberLength: 8,
    phoneFormat: "+228 XX XX XX XX",
    operators: [
      { value: "moov_tg", label: "Moov" },
      { value: "togocom_tg", label: "Togocom" },
    ],
  },
  {
    code: "CG",
    name: "Congo-Brazzaville",
    flag: "🇨🇬",
    callingCode: "242",
    nationalNumberLength: 9,
    phoneFormat: "+242 XX XXX XX XX",
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
  if (
    !/^[+()\d\s.-]+$/.test(trimmed) ||
    (trimmed.includes("+") && !trimmed.startsWith("+"))
  ) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, "");
  const international = trimmed.startsWith("00") ? digits.slice(2) : digits;
  const isInternational = trimmed.startsWith("+") || trimmed.startsWith("00");
  if (isInternational && !international.startsWith(country.callingCode)) {
    return null;
  }

  const national = international.startsWith(country.callingCode)
    ? international.slice(country.callingCode.length)
    : international;
  if (
    !/^\d+$/.test(national) ||
    national.length !== country.nationalNumberLength
  ) {
    return null;
  }
  return `${country.callingCode}${national}`;
}
