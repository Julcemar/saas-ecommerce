"use client";

import { useParams } from "next/navigation";
import CustomerForm from "@/components/admin/CustomerForm";

export default function AdminEditCustomerPage() {
  const params = useParams();
  const customerId = String(params?.id || "");
  return <CustomerForm mode="edit" customerId={customerId} />;
}
