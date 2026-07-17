export const VALID_COUNTRIES = ["jo", "sa", "eg", "ps"] as const;
export type CountryCode = (typeof VALID_COUNTRIES)[number];
export const DEFAULT_COUNTRY: CountryCode = "jo";

export const COUNTRY_ID_BY_CODE: Record<CountryCode, string> = {
  jo: "1",
  sa: "2",
  eg: "3",
  ps: "4",
};

export const COUNTRY_CODE_BY_ID: Record<string, CountryCode> = {
  "1": "jo",
  "2": "sa",
  "3": "eg",
  "4": "ps",
};

export interface CountryMeta {
  code: CountryCode;
  name: string;
  flag: string;
}

export const COUNTRY_META: Record<CountryCode, CountryMeta> = {
  jo: { code: "jo", name: "الأردن",    flag: "🇯🇴" },
  sa: { code: "sa", name: "السعودية",  flag: "🇸🇦" },
  eg: { code: "eg", name: "مصر",       flag: "🇪🇬" },
  ps: { code: "ps", name: "فلسطين",   flag: "🇵🇸" },
};

export function isValidCountry(value: string | undefined): value is CountryCode {
  return !!value && (VALID_COUNTRIES as readonly string[]).includes(value);
}

export function normalizeCountry(value: string | undefined): CountryCode {
  return isValidCountry(value) ? value : DEFAULT_COUNTRY;
}

export function countryIdFromCode(code: string | undefined): string {
  return COUNTRY_ID_BY_CODE[normalizeCountry(code)];
}

export function countryCodeFromId(id: string | number | undefined): CountryCode {
  return COUNTRY_CODE_BY_ID[String(id ?? "")] ?? DEFAULT_COUNTRY;
}

export function countryQuery(code: string | undefined): { country: CountryCode; country_id: string } {
  const country = normalizeCountry(code);
  return {
    country,
    country_id: COUNTRY_ID_BY_CODE[country],
  };
}

/**
 * Replace the leading country segment in a URL.
 * If the URL has no country prefix (e.g. "/" or "/articles"), returns the path
 * unchanged so the user stays on the same page while localStorage holds the choice.
 */
export function switchCountryInPath(path: string, newCountry: CountryCode): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0 && isValidCountry(segments[0])) {
    segments[0] = newCountry;
    return "/" + segments.join("/");
  }
  return path || "/";
}

export const routes = {
  lessonList: (c: CountryCode) => `/${c}/lesson`,
  lessonDetail: (c: CountryCode, classId: number | string) => `/${c}/lesson/${classId}`,
  subject: (c: CountryCode, subjectId: number | string) => `/${c}/lesson/subjects/${subjectId}`,
  subjectCategory: (
    c: CountryCode,
    subjectId: number | string,
    semesterId: number | string,
    categoryId: number | string,
  ) => `/${c}/lesson/subjects/${subjectId}/articles/${semesterId}/${categoryId}`,
  article: (c: CountryCode, id: number | string) => `/${c}/lesson/articles/${id}`,
  postsList: (c: CountryCode) => `/${c}/posts`,
  post: (c: CountryCode, id: number | string) => `/${c}/posts/${id}`,
  postsCategory: (c: CountryCode, categoryId: number | string) => `/${c}/posts/category/${categoryId}`,
};
