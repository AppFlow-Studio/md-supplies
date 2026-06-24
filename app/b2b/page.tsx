import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, isSessionExpiring } from "@/lib/shopify/session";
import { customerFetch } from "@/lib/shopify/customer";
import { GET_CUSTOMER, GET_CUSTOMER_ORDERS, GET_CUSTOMER_ADDRESSES } from "@/lib/shopify/queries/customer";
import { AccountView } from "@/components/account/AccountView";
import type { Customer, CustomerOrder, CustomerAddress } from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "My Account | MD Supplies",
  description:
    "Manage your MD Supplies account — track orders, save addresses, and view invoices.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    return <AccountView customer={null} orders={[]} addresses={[]} />;
  }

  if (isSessionExpiring(session.expiresAt)) {
    redirect("/api/auth/refresh?next=/b2b");
  }

  let customer: Customer | null;
  let orders: CustomerOrder[];
  let addresses: CustomerAddress[];

  try {
    const [customerResult, ordersResult, addressesResult] = await Promise.all([
      customerFetch<{ customer: Customer }>(GET_CUSTOMER, session.accessToken),
      customerFetch<{ customer: { orders: { nodes: CustomerOrder[] } } }>(
        GET_CUSTOMER_ORDERS, session.accessToken, { first: 10 }
      ),
      customerFetch<{ customer: { addresses: { nodes: CustomerAddress[] } } }>(
        GET_CUSTOMER_ADDRESSES, session.accessToken, { first: 20 }
      ),
    ]);

    customer = customerResult.customer;
    orders = ordersResult.customer.orders.nodes;
    addresses = addressesResult.customer.addresses.nodes;
  } catch {
    return <AccountView customer={null} orders={[]} addresses={[]} />;
  }

  return <AccountView customer={customer} orders={orders} addresses={addresses} />;
}
