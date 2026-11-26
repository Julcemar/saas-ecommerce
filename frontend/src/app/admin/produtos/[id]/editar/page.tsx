"use client";

import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export default function AdminEditProductPage() {
  const params = useParams();
  const productId = String(params?.id || "");
  return <ProductForm mode="edit" productId={productId} />;
}
