import { countryQuery } from "@/lib/country";
import { api, buildQuery } from "../client";
import type { SchoolClass, Semester, Subject } from "../types";

type CountryParams = { country?: string };

function countryParams(params: CountryParams = {}) {
  return countryQuery(params.country);
}

// The dashboard list endpoints are paginated (15/page by default). The academic
// tree is small and the admin UI filters/sorts it client-side, so we fetch the
// whole set at once — 500 is the backend's max per_page.
const FETCH_ALL = { per_page: 500 };

// ===== Academic management (classes, semesters, subjects) =====
export const adminAcademicApi = {
  listClasses: (params: CountryParams = {}) =>
    api.get<SchoolClass[]>(`/dashboard/school-classes${buildQuery({ ...countryParams(params), ...FETCH_ALL })}`),
  createClass: (input: { grade_name: string; grade_level?: number }, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.post<SchoolClass>(`/dashboard/school-classes${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  updateClass: (id: number | string, input: Partial<{ grade_name: string; grade_level: number }>, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.put<SchoolClass>(`/dashboard/school-classes/${id}${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  deleteClass: (id: number | string, params: CountryParams = {}) =>
    api.delete<{ message: string }>(`/dashboard/school-classes/${id}${buildQuery(countryParams(params))}`),

  listSemesters: (params: CountryParams = {}) =>
    api.get<Semester[]>(`/dashboard/semesters${buildQuery({ ...countryParams(params), ...FETCH_ALL })}`),
  createSemester: (input: { semester_name: string; grade_level?: number }, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.post<Semester>(`/dashboard/semesters${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  getSemester: (id: number | string, params: CountryParams = {}) =>
    api.get<Semester>(`/dashboard/semesters/${id}${buildQuery(countryParams(params))}`),
  updateSemester: (id: number | string, input: Partial<{ semester_name: string; grade_level: number }>, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.put<Semester>(`/dashboard/semesters/${id}${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  deleteSemester: (id: number | string, params: CountryParams = {}) =>
    api.delete<{ message: string }>(`/dashboard/semesters/${id}${buildQuery(countryParams(params))}`),

  listSubjects: (params: CountryParams = {}) =>
    api.get<Subject[]>(`/dashboard/subjects${buildQuery({ ...countryParams(params), ...FETCH_ALL })}`),
  createSubject: (input: { subject_name: string; grade_level: number }, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.post<Subject>(`/dashboard/subjects${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  getSubject: (id: number | string, params: CountryParams = {}) =>
    api.get<Subject>(`/dashboard/subjects/${id}${buildQuery(countryParams(params))}`),
  updateSubject: (id: number | string, input: Partial<{ subject_name: string; grade_level: number }>, params: CountryParams = {}) => {
    const query = countryParams(params);
    return api.put<Subject>(`/dashboard/subjects/${id}${buildQuery(query)}`, {
      ...input,
      country_id: query.country_id,
    });
  },
  deleteSubject: (id: number | string, params: CountryParams = {}) =>
    api.delete<{ message: string }>(`/dashboard/subjects/${id}${buildQuery(countryParams(params))}`),
};
