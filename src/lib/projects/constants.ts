export const projectCategories = [
  ["apartment", "Apartment"], ["house", "House"], ["office", "Office"], ["beauty_salon", "Beauty salon"],
  ["pilates_studio", "Pilates studio"], ["restaurant", "Restaurant"], ["hotel", "Hotel"], ["custom", "Custom"],
] as const;

export const projectStatuses = [
  ["planning", "Planning"], ["design", "Design"], ["ordering", "Ordering"], ["construction", "Construction"],
  ["installation", "Installation"], ["completed", "Completed"],
] as const;

export const priorities = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]] as const;

export type ProjectCategory = (typeof projectCategories)[number][0];
export type ProjectStatus = (typeof projectStatuses)[number][0];

export const labels = (entries: readonly (readonly [string, string])[]) => Object.fromEntries(entries);
