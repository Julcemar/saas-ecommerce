import React from "react";
import AccountShell from "@/components/AccountShell";

export default function MinhaContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountShell>{children}</AccountShell>;
}
