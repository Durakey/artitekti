"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type RoomActionState = { error?: string; success?: boolean };

const roomInput = z.object({
  name: z.string().trim().min(2, "Room name must have at least 2 characters.").max(160),
  description: z.string().trim().max(1000).optional(),
});

const imageInput = z.object({
  roomId: z.string().uuid(),
  projectId: z.string().uuid(),
  imageUrl: z.string().trim().url("Enter a valid image URL."),
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

export async function createRoom(_: RoomActionState, formData: FormData) {
  const parsed = roomInput.safeParse({
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
  });

  const projectId = getRequiredString(formData, "projectId");
  if (!projectId) {
    return { error: "Missing project identifier." };
  }

  if (!parsed.success) {
    return { error: JSON.stringify(parsed.error.issues, null, 2) };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const { error } = await supabase.from("rooms").insert({
    project_id: projectId,
    name: parsed.data.name,
    description: parsed.data.description,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function addInspirationImage(formData: FormData) {
  const parsed = imageInput.safeParse({
    roomId: getRequiredString(formData, "roomId"),
    projectId: getRequiredString(formData, "projectId"),
    imageUrl: getRequiredString(formData, "imageUrl"),
  });

  if (!parsed.success) {
    return { error: JSON.stringify(parsed.error.issues, null, 2) };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const { error } = await supabase.from("room_inspiration_images").insert({
    room_id: parsed.data.roomId,
    image_url: parsed.data.imageUrl,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath(`/projects/${parsed.data.projectId}/rooms/${parsed.data.roomId}`);
  return { success: true };
}

export async function updateRoom(_: RoomActionState, formData: FormData) {
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!roomId || !projectId) {
    return { error: "Missing room or project identifier." };
  }

  const parsed = roomInput.safeParse({
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
  });

  if (!parsed.success) {
    return { error: JSON.stringify(parsed.error.issues, null, 2) };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const { error } = await supabase
    .from("rooms")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", roomId)
    .eq("project_id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

export async function deleteRoom(_: RoomActionState, formData: FormData) {
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!roomId || !projectId) {
    return { error: "Missing room or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const { error } = await supabase.from("rooms").delete().eq("id", roomId).eq("project_id", projectId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
