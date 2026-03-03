"use client";

import { useSearchParams } from "next/navigation";
import DiscountForm, { emptyForm } from "../_components/DiscountForm";

export default function NewDiscountPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "shipping" ? "shipping" : "product";

  return (
    <DiscountForm
      title="Create Discount Code"
      subtitle="Set up a new discount code for your customers"
      initialValues={{ ...emptyForm, discountType: type }}
    />
  );
}
