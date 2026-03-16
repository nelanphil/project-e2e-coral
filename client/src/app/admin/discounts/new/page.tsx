"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DiscountForm, { emptyForm } from "../_components/DiscountForm";

function NewDiscountContent() {
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

export default function NewDiscountPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>}>
      <NewDiscountContent />
    </Suspense>
  );
}
