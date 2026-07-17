"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ProductActionState = { error?: string; success?: boolean };

const productInput = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(160),
  category: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  quantity: z.preprocess((value) => Number(value), z.number().int().min(0)),
});

const productDetailInput = productInput.extend({
  cover_image_url: z.string().trim().max(2048).optional(),
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

async function ensureRoomOwnership(supabase: Awaited<ReturnType<typeof createClient>>, roomId: string, projectId: string, userId: string) {
  const { data: room, error: roomError } = await supabase.from("rooms").select("id, project_id").eq("id", roomId).maybeSingle();
  if (roomError) {
    return { error: roomError.message };
  }

  if (!room) {
    return { error: "Room not found." };
  }

  if (room.project_id !== projectId) {
    return { error: "Room does not belong to this project." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return { error: projectError.message };
  }

  if (!project || project.owner_id !== userId) {
    return { error: "You do not have permission to manage this room." };
  }

  return { room };
}

export async function createProduct(_: ProductActionState, formData: FormData) {
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!roomId || !projectId) {
    return { error: "Missing room or project identifier." };
  }

  const parsed = productInput.safeParse({
    name: getRequiredString(formData, "name"),
    category: getOptionalString(formData, "category"),
    notes: getOptionalString(formData, "notes"),
    quantity: getRequiredString(formData, "quantity"),
  });

  if (!parsed.success) {
    return { error: JSON.stringify(parsed.error.issues, null, 2) };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { error } = await supabase.from("room_products").insert({
    room_id: roomId,
    name: parsed.data.name,
    category: parsed.data.category,
    notes: parsed.data.notes,
    quantity: parsed.data.quantity,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

export async function updateProduct(_: ProductActionState, formData: FormData) {
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!productId || !roomId || !projectId) {
    return { error: "Missing product, room, or project identifier." };
  }

  const parsed = productDetailInput.safeParse({
    name: getRequiredString(formData, "name"),
    category: getOptionalString(formData, "category"),
    notes: getOptionalString(formData, "notes"),
    quantity: getRequiredString(formData, "quantity"),
    cover_image_url: getOptionalString(formData, "cover_image_url"),
  });

  if (!parsed.success) {
    return { error: JSON.stringify(parsed.error.issues, null, 2) };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { error } = await supabase
    .from("room_products")
    .update({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      notes: parsed.data.notes ?? null,
      quantity: parsed.data.quantity,
      cover_image_url: parsed.data.cover_image_url ?? null,
    })
    .eq("id", productId)
    .eq("room_id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

export async function deleteProduct(_: ProductActionState, formData: FormData) {
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!productId || !roomId || !projectId) {
    return { error: "Missing product, room, or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { error } = await supabase.from("room_products").delete().eq("id", productId).eq("room_id", roomId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

// ─── Option actions (product_options table) ────────────────────────────────────

const optionInput = z.object({
  store_name: z.string().trim().min(1, "Store name is required.").max(160),
  phone_number: z.string().trim().max(32).optional(),
  price: z.preprocess((v) => Number(v), z.number().min(0)),
  currency: z.string().trim().max(3).optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  cover_image_url: z.string().trim().max(2048).optional(),
});

const paymentInput = z.object({
  amount: z.preprocess((value) => Number(value), z.number().positive("Amount must be greater than 0.")),
  due_date: z.string().trim().min(1, "Due date is required."),
});

export async function createAlternative(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!productId || !roomId || !projectId) {
    return { error: "Missing product, room, or project identifier." };
  }

  const parsed = optionInput.safeParse({
    store_name: getRequiredString(formData, "store_name"),
    phone_number: getOptionalString(formData, "phone_number"),
    price: getRequiredString(formData, "price"),
    currency: getOptionalString(formData, "currency"),
    location: getOptionalString(formData, "location"),
    notes: getOptionalString(formData, "notes"),
    cover_image_url: getOptionalString(formData, "cover_image_url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) return { error: ownership.error };

  const createPayload = {
    product_id: productId,
    store_name: parsed.data.store_name,
    phone_number: parsed.data.phone_number ?? null,
    price: parsed.data.price,
    currency: parsed.data.currency ?? "EUR",
    location: parsed.data.location ?? null,
    notes: parsed.data.notes ?? null,
    cover_image_url: parsed.data.cover_image_url ?? null,
    is_selected: false,
  };
  console.log("[createAlternative] payload received", createPayload);

  const { data: inserted, error } = await supabase
    .from("product_options")
    .insert(createPayload)
    .select("id")
    .single();

  console.log("[createAlternative] Supabase insert result", inserted);
  console.log("[createAlternative] Supabase insert error", error);

  if (error) return { error: error.message };

  const { count } = await supabase
    .from("product_options")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (count === 1) {
    const { data: selectData, error: selectError } = await supabase
      .from("product_options")
      .update({ is_selected: true })
      .eq("id", inserted.id)
      .select("id, is_selected");
    console.log("[createAlternative] Supabase select-option update result", selectData);
    console.log("[createAlternative] Supabase select-option update error", selectError);

    const { data: pointerData, error: pointerError } = await supabase
      .from("room_products")
      .update({ selected_option_id: inserted.id })
      .eq("id", productId)
      .eq("room_id", roomId)
      .select("id, selected_option_id");
    console.log("[createAlternative] Supabase room_products pointer update result", pointerData);
    console.log("[createAlternative] Supabase room_products pointer update error", pointerError);
  }

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  console.log("[createAlternative] returned data", { success: true });
  return { success: true };
}

export async function updateAlternative(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const alternativeId = getRequiredString(formData, "alternativeId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!alternativeId || !productId || !roomId || !projectId) {
    return { error: "Missing option, product, room, or project identifier." };
  }

  const parsed = optionInput.safeParse({
    store_name: getRequiredString(formData, "store_name"),
    phone_number: getOptionalString(formData, "phone_number"),
    price: getRequiredString(formData, "price"),
    currency: getOptionalString(formData, "currency"),
    location: getOptionalString(formData, "location"),
    notes: getOptionalString(formData, "notes"),
    cover_image_url: getOptionalString(formData, "cover_image_url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) return { error: ownership.error };

  const updatePayload = {
    store_name: parsed.data.store_name,
    phone_number: parsed.data.phone_number ?? null,
    price: parsed.data.price,
    currency: parsed.data.currency ?? "EUR",
    location: parsed.data.location ?? null,
    notes: parsed.data.notes ?? null,
    cover_image_url: parsed.data.cover_image_url ?? null,
  };
  console.log("[updateAlternative] payload received", {
    alternativeId,
    productId,
    roomId,
    projectId,
    ...updatePayload,
  });

  const { data: updateResult, error } = await supabase
    .from("product_options")
    .update(updatePayload)
    .eq("id", alternativeId)
    .eq("product_id", productId)
    .select("id, store_name");

  console.log("[updateAlternative] Supabase update result", updateResult);
  console.log("[updateAlternative] Supabase update error", error);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  console.log("[updateAlternative] returned data", { success: true });
  return { success: true };
}

export async function deselectAlternative(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const alternativeId = getRequiredString(formData, "alternativeId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!alternativeId || !productId || !roomId || !projectId) {
    return { error: "Missing option, product, room, or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) return { error: ownership.error };

  const { error: clearError } = await supabase
    .from("product_options")
    .update({ is_selected: false })
    .eq("id", alternativeId)
    .eq("product_id", productId);
  if (clearError) return { error: clearError.message };

  const { error: pointerError } = await supabase
    .from("room_products")
    .update({ selected_option_id: null })
    .eq("id", productId)
    .eq("room_id", roomId);
  if (pointerError) return { error: pointerError.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

export async function createProductPayment(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!productId || !roomId || !projectId) {
    return { error: "Missing product, room, or project identifier." };
  }

  const parsed = paymentInput.safeParse({
    amount: getRequiredString(formData, "amount"),
    due_date: getRequiredString(formData, "dueDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment input." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { data: product, error: productError } = await supabase
    .from("room_products")
    .select("id, selected_option_id")
    .eq("id", productId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (productError) return { error: productError.message };
  if (!product) return { error: "Product not found in this room." };

  const { data: options, error: optionsError } = await supabase
    .from("product_options")
    .select("id, price, is_selected")
    .eq("product_id", productId);
  if (optionsError) return { error: optionsError.message };

  const selectedOption =
    (options ?? []).find((option) => option.id === product.selected_option_id) ??
    (options ?? []).find((option) => option.is_selected) ??
    null;
  if (!selectedOption) {
    return { error: "Select a product option before adding a payment." };
  }

  const { data: existingPayments, error: paymentsError } = await supabase
    .from("room_product_payments")
    .select("amount, paid_at")
    .eq("product_id", productId);
  if (paymentsError) return { error: paymentsError.message };

  const totalPaidPayments = (existingPayments ?? [])
    .filter((payment) => payment.paid_at)
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const selectedOptionPrice = Number(selectedOption.price ?? 0);
  const remainingBalance = Math.max(0, selectedOptionPrice - totalPaidPayments);
  if (parsed.data.amount > remainingBalance) {
    return { error: `Amount exceeds remaining balance. You can add up to ${remainingBalance.toFixed(2)}.` };
  }

  const { error } = await supabase.from("room_product_payments").insert({
    product_id: productId,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    notes: getOptionalString(formData, "notes"),
  });

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/payments");
  revalidatePath("/reports");
  return { success: true };
}

export async function updateProductPayment(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const paymentId = getRequiredString(formData, "paymentId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");

  if (!paymentId || !productId || !roomId || !projectId) {
    return { error: "Missing payment, product, room, or project identifier." };
  }

  const parsed = paymentInput.safeParse({
    amount: getRequiredString(formData, "amount"),
    due_date: getRequiredString(formData, "dueDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment input." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("room_product_payments")
    .select("id, amount")
    .eq("id", paymentId)
    .eq("product_id", productId)
    .maybeSingle();

  if (paymentError) return { error: paymentError.message };
  if (!payment) return { error: "Payment not found." };

  const { data: product, error: productError } = await supabase
    .from("room_products")
    .select("id, selected_option_id")
    .eq("id", productId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (productError) return { error: productError.message };
  if (!product) return { error: "Product not found in this room." };

  const { data: options, error: optionsError } = await supabase
    .from("product_options")
    .select("id, price, is_selected")
    .eq("product_id", productId);
  if (optionsError) return { error: optionsError.message };

  const selectedOption =
    (options ?? []).find((option) => option.id === product.selected_option_id) ??
    (options ?? []).find((option) => option.is_selected) ??
    null;
  if (!selectedOption) {
    return { error: "Select a product option before editing a payment." };
  }

  const { data: existingPayments, error: paymentsError } = await supabase
    .from("room_product_payments")
    .select("amount, paid_at")
    .eq("product_id", productId);
  if (paymentsError) return { error: paymentsError.message };

  const paidAmountExcludingCurrent = (existingPayments ?? [])
    .filter((paymentRow) => paymentRow.paid_at && paymentRow.amount !== payment.amount)
    .reduce((sum, paymentRow) => sum + Number(paymentRow.amount ?? 0), 0);
  const selectedOptionPrice = Number(selectedOption.price ?? 0);
  const remainingBalance = Math.max(0, selectedOptionPrice - paidAmountExcludingCurrent);

  if (parsed.data.amount > remainingBalance) {
    return { error: `Amount exceeds remaining balance. You can update up to ${remainingBalance.toFixed(2)}.` };
  }

  const { error } = await supabase
    .from("room_product_payments")
    .update({ amount: parsed.data.amount, due_date: parsed.data.due_date, notes: getOptionalString(formData, "notes") })
    .eq("id", paymentId)
    .eq("product_id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/payments");
  revalidatePath("/reports");
  return { success: true };
}

export async function updateProductPaymentStatus(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const paymentId = getRequiredString(formData, "paymentId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  const status = getRequiredString(formData, "status").toLowerCase();

  if (!paymentId || !productId || !roomId || !projectId) {
    return { error: "Missing payment, product, room, or project identifier." };
  }

  if (status !== "paid" && status !== "pending") {
    return { error: "Invalid payment status." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const payload = status === "paid"
    ? { paid_at: new Date().toISOString() }
    : { paid_at: null };

  const { error } = await supabase
    .from("room_product_payments")
    .update(payload)
    .eq("id", paymentId)
    .eq("product_id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProductPayment(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const paymentId = getRequiredString(formData, "paymentId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");

  if (!paymentId || !productId || !roomId || !projectId) {
    return { error: "Missing payment, product, room, or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) {
    return { error: ownership.error };
  }

  const { error } = await supabase
    .from("room_product_payments")
    .delete()
    .eq("id", paymentId)
    .eq("product_id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/payments");
  return { success: true };
}

export async function deleteAlternative(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const alternativeId = getRequiredString(formData, "alternativeId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!alternativeId || !productId || !roomId || !projectId) {
    return { error: "Missing option, product, room, or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) return { error: ownership.error };

  const { data: option, error: fetchError } = await supabase
    .from("product_options")
    .select("id, is_selected")
    .eq("id", alternativeId)
    .eq("product_id", productId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("product_options")
    .delete()
    .eq("id", alternativeId)
    .eq("product_id", productId);
  if (error) return { error: error.message };

  if (option?.is_selected) {
    await supabase.from("room_products").update({ selected_option_id: null }).eq("id", productId).eq("room_id", roomId);

    const { data: nextOption, error: nextError } = await supabase
      .from("product_options")
      .select("id")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) return { error: nextError.message };
    if (nextOption?.id) {
      await supabase.from("product_options").update({ is_selected: true }).eq("id", nextOption.id);
      await supabase.from("room_products").update({ selected_option_id: nextOption.id }).eq("id", productId).eq("room_id", roomId);
    }
  }

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

export async function selectAlternative(_: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const alternativeId = getRequiredString(formData, "alternativeId");
  const productId = getRequiredString(formData, "productId");
  const roomId = getRequiredString(formData, "roomId");
  const projectId = getRequiredString(formData, "projectId");
  if (!alternativeId || !productId || !roomId || !projectId) {
    return { error: "Missing option, product, room, or project identifier." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const ownership = await ensureRoomOwnership(supabase, roomId, projectId, user.id);
  if (ownership.error) return { error: ownership.error };

  const { error: clearError } = await supabase
    .from("product_options")
    .update({ is_selected: false })
    .eq("product_id", productId);
  if (clearError) return { error: clearError.message };

  const { error } = await supabase
    .from("product_options")
    .update({ is_selected: true })
    .eq("id", alternativeId)
    .eq("product_id", productId);
  if (error) return { error: error.message };

  const { error: pointerError } = await supabase
    .from("room_products")
    .update({ selected_option_id: alternativeId })
    .eq("id", productId)
    .eq("room_id", roomId);
  if (pointerError) return { error: pointerError.message };

  revalidatePath(`/projects/${projectId}/rooms/${roomId}`);
  return { success: true };
}

