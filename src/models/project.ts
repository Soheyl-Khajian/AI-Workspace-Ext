// src/models/project.ts
export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  description?: string;
};
