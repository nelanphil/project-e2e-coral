"use server";

import { revalidatePath } from "next/cache";

export async function revalidateProducts() {
  revalidatePath("/store");
  revalidatePath("/");
  revalidatePath("/category", "layout");
  revalidatePath("/collections", "layout");
  revalidatePath("/coral/[slug]", "page");
}

export async function revalidateCollections() {
  revalidatePath("/collections", "layout");
  revalidatePath("/");
}
