"use server";

import { revalidatePath } from "next/cache";

export async function revalidateProducts() {
  revalidatePath("/store");
  revalidatePath("/");
  revalidatePath("/category", "layout");
}

export async function revalidateCollections() {
  revalidatePath("/collections", "layout");
  revalidatePath("/");
}
