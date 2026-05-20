import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "My Account | MD Supplies",
  description:
    "Manage your MD Supplies account — track orders, save addresses, and view invoices.",
};

export default function AccountPage() {
  return <AccountView />;
}
