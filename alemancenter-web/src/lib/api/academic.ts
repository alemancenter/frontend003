import { api, buildQuery } from "./client";
import type { Article, SchoolClass, SemestersResponse, Subject } from "./types";

export const academicApi = {
  listSchoolClasses: (country: string) =>
    api.get<SchoolClass[]>(`/school-classes${buildQuery({ country })}`, { skipAuth: true }),

  getSchoolClass: (id: number | string, country: string) =>
    api.get<SchoolClass>(`/school-classes/${id}${buildQuery({ country })}`, { skipAuth: true }),

  filterMeta: (country: string) =>
    api.get<Record<string, unknown>>(`/filter${buildQuery({ country })}`, { skipAuth: true }),

  listSubjects: (classId: number | string, country: string) =>
    api.get<Subject[]>(`/filter/subjects/${classId}${buildQuery({ country })}`, { skipAuth: true }),

  listSemesters: (subjectId: number | string, country: string) =>
    api.get<SemestersResponse>(`/filter/semesters/${subjectId}${buildQuery({ country })}`, {
      skipAuth: true,
    }),

  listGrades: (country: string) =>
    api.get<SchoolClass[]>(`/grades${buildQuery({ country })}`, { skipAuth: true }),

  getGrade: (id: number | string, country: string) =>
    api.get<SchoolClass>(`/grades/${id}${buildQuery({ country })}`, { skipAuth: true }),

  getGradeArticles: (
    id: number | string,
    country: string,
    params: { page?: number; limit?: number } = {},
  ) =>
    api.get<Article[]>(`/grades/articles/${id}${buildQuery({ country, ...params })}`, {
      skipAuth: true,
    }),
};
