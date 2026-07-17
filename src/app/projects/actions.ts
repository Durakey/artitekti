"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ProjectActionState = { error?: string; success?: boolean };

const optionalText = (max: number) => z.string().trim().max(max).optional();

const projectInput = z
  .object({
    name: z.string().trim().min(2, "Project name must have at least 2 characters.").max(160),
    clientName: z.string().trim().min(2, "Client name must have at least 2 characters.").max(160),
    clientEmail: z.string().trim().email("Enter a valid client email.").optional(),
    clientPhone: optionalText(50),
    location: optionalText(240),
    category: z.enum([
      "apartment",
      "house",
      "office",
      "beauty_salon",
      "pilates_studio",
      "restaurant",
      "hotel",
      "custom",
    ]),
    customCategory: optionalText(80),
    budget: z.coerce.number().min(0, "Budget cannot be negative.").max(999999999999.99),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    description: optionalText(3000),
  })
  .superRefine((value, ctx) => {
    if (value.category === "custom" && !value.customCategory) {
      ctx.addIssue({
        code: "custom",
        path: ["customCategory"],
        message: "Name the custom project category.",
      });
    }

    if (value.startDate && value.deadline && value.deadline < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "Deadline cannot be before the start date.",
      });
    }
  });

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null ? "" : String(value).trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

export async function createProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const parsed = projectInput.safeParse({
    name: getRequiredString(formData, "name"),
    clientName: getRequiredString(formData, "clientName"),
    clientEmail: getOptionalString(formData, "clientEmail"),
    clientPhone: getOptionalString(formData, "clientPhone"),
    location: getOptionalString(formData, "location"),
    category: getRequiredString(formData, "category"),
    customCategory: getOptionalString(formData, "customCategory"),
    budget: getRequiredString(formData, "budget"),
    currency: getRequiredString(formData, "currency"),
    startDate: getOptionalString(formData, "startDate"),
    deadline: getOptionalString(formData, "deadline"),
    description: getOptionalString(formData, "description"),
  });

  if (!parsed.success) {
    console.error("ZOD ERROR:");
    console.error(JSON.stringify(parsed.error.issues, null, 2));

    return {
      error: JSON.stringify(parsed.error.issues, null, 2),
    };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Your session has expired. Please sign in again." };
    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        client_name: parsed.data.clientName,
        client_email: parsed.data.clientEmail,
        client_phone: parsed.data.clientPhone,
        location: parsed.data.location,
        category: parsed.data.category,
        custom_category: parsed.data.customCategory,
        budget_amount: parsed.data.budget,
        currency: parsed.data.currency,
        start_date: parsed.data.startDate,
        deadline: parsed.data.deadline,
        description: parsed.data.description,
      })
      .select();

    console.log("SUPABASE ERROR:", error);
    console.log("SUPABASE DATA:", data);

    if (error) {
      return {
        error: error.message,
      };
    }
  } catch (error) {
    console.error("createProject exception:", error);
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unexpected error creating project";
    return { error: message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const projectId = getRequiredString(formData, "projectId");
  if (!projectId) {
    return { error: "Missing project identifier." };
  }

  const parsed = projectInput.safeParse({
    name: getRequiredString(formData, "name"),
    clientName: getRequiredString(formData, "clientName"),
    clientEmail: getOptionalString(formData, "clientEmail"),
    clientPhone: getOptionalString(formData, "clientPhone"),
    location: getOptionalString(formData, "location"),
    category: getRequiredString(formData, "category"),
    customCategory: getOptionalString(formData, "customCategory"),
    budget: getRequiredString(formData, "budget"),
    currency: getRequiredString(formData, "currency"),
    startDate: getOptionalString(formData, "startDate"),
    deadline: getOptionalString(formData, "deadline"),
    description: getOptionalString(formData, "description"),
  });

  if (!parsed.success) {
    console.error("ZOD ERROR:");
    console.error(JSON.stringify(parsed.error.issues, null, 2));

    return {
      error: JSON.stringify(parsed.error.issues, null, 2),
    };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Your session has expired. Please sign in again." };

    const { error } = await supabase
      .from("projects")
      .update({
        name: parsed.data.name,
        client_name: parsed.data.clientName,
        client_email: parsed.data.clientEmail,
        client_phone: parsed.data.clientPhone,
        location: parsed.data.location,
        category: parsed.data.category,
        custom_category: parsed.data.customCategory,
        budget_amount: parsed.data.budget,
        currency: parsed.data.currency,
        start_date: parsed.data.startDate,
        deadline: parsed.data.deadline,
        description: parsed.data.description,
      })
      .eq("id", projectId)
      .eq("owner_id", user.id);

    if (error) {
      return {
        error: error.message,
      };
    }
  } catch (error) {
    console.error("updateProject exception:", error);
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unexpected error updating project";
    return { error: message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const projectId = getRequiredString(formData, "projectId");
  if (!projectId) {
    return { error: "Missing project identifier." };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Your session has expired. Please sign in again." };

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("owner_id", user.id);

    if (error) {
      return {
        error: error.message,
      };
    }
  } catch (error) {
    console.error("deleteProject exception:", error);
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unexpected error deleting project";
    return { error: message };
  }

  revalidatePath("/projects");
  return { success: true };
}
