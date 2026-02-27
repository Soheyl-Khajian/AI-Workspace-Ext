// src/storage/index.ts
import { insertProject, getAllProjects } from "./repo/projectsRepo";
import type { Project } from "../models/project";

export async function createProject(
  name: string,
  description?: string,
): Promise<Project> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Project name is required");

  const project: Project = {
    id: crypto.randomUUID(),
    name: trimmedName,
    createdAt: Date.now(),
  };

  const descTrimmed = description?.trim();
  if (descTrimmed) project.description = descTrimmed;

  await insertProject(project);

  return project;
}

export async function listProjects(): Promise<Project[]> {
  return getAllProjects();
}

// export function createItem() {}

// export function listItemsByProject() {}

// export function updateItem() {}

// export function deleteItem() {}

// export function deleteProjectCascade() {}
