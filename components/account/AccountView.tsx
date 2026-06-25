import Link from "next/link";
import {
  Truck, MapPin,
  Package, ChevronRight, LogOut, User,
  Zap, Activity, Home, Heart, Building2, Shield,
} from "lucide-react";

// ─── Exported types (consumed by the account page and orders page) ─────────────

export interface CustomerAddress {
  id: string
  firstName:   string | null
  lastName:    string | null
  address1:    string | null
  address2:    string | null
  city:        string | null
  province:    string | null
  country:     string | null
  zip:         string | null
  phoneNumber: string | null
}

export interface CustomerOrder {
  id:                string
  number:            number
  processedAt:       string
  financialStatus:   string
  fulfillmentStatus: string
  totalPrice:        { amount: string; currencyCode: string }
}

export interface Customer {
  id:           string
  firstName:    string | null
  lastName:     string | null
  emailAddress: { emailAddress: string } | null
  phoneNumber:  { phoneNumber: string } | null
  defaultAddress: CustomerAddress | null
}

// ─── Static data ──────────────────────────────────────────────────────────────

const INDUSTRY_LINKS = [
  { label: "Urgent Care",     href: "/industries/urgent-care",      Icon: Zap       },
  { label: "HRT Clinics",     href: "/industries/hrt-clinics",      Icon: Activity  },
  { label: "Home Health",     href: "/industries/home-health",      Icon: Home      },
  { label: "Long-Term Care",  href: "/industries/long-term-care",   Icon: Heart     },
  { label: "Clinics",         href: "/industries/private-practice", Icon: Building2 },
  { label: "First Responder", href: "/industries/ems",              Icon: Shield    },
];

const TESTIMONIALS = [
  {
    quote: "MD Supplies has completely streamlined our clinic's ordering process. Reliable fulfillment means we're never caught short on supplies.",
    name: "Dr. Sarah Mitchell",
    practice: "Urgent Care Director",
  },
  {
    quote: "The wholesale pricing and Net 30 terms are a game-changer for our HRT practice. We've cut supply costs by nearly 30%.",
    name: "James Reeves, PA-C",
    practice: "HRT Clinic Owner",
  },
  {
    quote: "Fast shipping, accurate orders every time. Our EMS unit relies on MD Supplies to keep all three of our vehicles stocked.",
    name: "Chief Dana Torres",
    practice: "EMS Operations Manager",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currencyCode,
  }).format(parseFloat(amount));
}

function getFulfillmentDisplay(status: string): { label: string; style: string } {
  switch (status) {
    case "FULFILLED":            return { label: "Delivered",  style: "bg-green-100 text-green-700"  };
    case "IN_PROGRESS":          return { label: "Shipped",    style: "bg-blue-100 text-blue-700"    };
    case "PARTIALLY_FULFILLED":  return { label: "Partial",    style: "bg-blue-100 text-blue-700"    };
    default:                     return { label: "Processing", style: "bg-yellow-100 text-yellow-700" };
  }
}

function addressLabel(address: CustomerAddress, defaultId: string | undefined, index: number): string {
  if (address.id === defaultId) return "Default Address";
  return `Address ${index + 1}`;
}

function formatAddressLine2(address: CustomerAddress): string {
  const parts = [address.city, address.province, address.zip].filter(Boolean);
  return parts.join(", ");
}

// ─── Logged-out view ──────────────────────────────────────────────────────────

function LoggedOutView() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="relative w-full h-[280px] sm:h-[420px] lg:absolute lg:inset-0 lg:left-[33%] lg:h-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/doc_with_ipad.jpg"
            alt="Healthcare professional using a tablet"
            className="absolute inset-0 w-[80%] h-full object-cover object-center"
            loading="eager"
          />
        </div>

        <div className="relative z-10 bg-white mx-4 sm:mx-8 lg:mx-0 lg:ml-[59px] lg:mt-[96px] lg:w-[662px] px-8 lg:px-14 pt-10 pb-12 flex flex-col gap-7">
          <div className="inline-flex self-start items-center px-4 py-2 rounded-full bg-[rgba(0,193,255,0.2)]">
            <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
              My Account
            </span>
          </div>
          <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.2] tracking-tight">
            Manage<br />Your Account
          </h1>
          <p className="text-gray-500 text-[18px] font-medium leading-[1.65] max-w-[516px]">
            Access your order history, track shipments, manage saved addresses, and update your account details in one centralized clinical dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Full-page navigation so the redirect to Shopify's hosted login follows correctly */}
            <a
              href="/api/auth/login"
              className="inline-flex items-center justify-center bg-navy-900 text-white text-[20px] font-semibold h-[59px] px-10 hover:bg-navy-950 transition-colors"
            >
              Log In
            </a>
            <a
              href="/api/auth/login"
              className="inline-flex items-center justify-center border border-navy-900 text-navy-900 text-[20px] font-semibold h-[59px] px-10 hover:bg-neutral-50 transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>

        <div className="hidden lg:block h-[140px]" />
      </section>

      {/* Trusted By */}
      <section className="w-full bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex flex-col items-center gap-5">
          <p className="text-gray-500 text-[18px] font-medium uppercase tracking-[0.36px] text-center">
            Trusted by Healthcare Providers Across the US
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {INDUSTRY_LINKS.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-teal-400 transition-colors"
              >
                <Icon size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors shrink-0" />
                <span className="text-[13px] font-semibold uppercase tracking-[0.3px] text-gray-500 group-hover:text-teal-500 transition-colors whitespace-nowrap">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 grid grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { value: "1,000+",   label: "Active Accounts" },
            { value: "Reliable", label: "Fulfillment"     },
            { value: "24-48 hr", label: "Fast Support"    },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <span className="text-navy-900 text-[35px] font-semibold leading-none">{value}</span>
              <span className="text-gray-500 text-[15px] uppercase tracking-[0.3px]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What You Can Do */}
      <section className="w-full bg-navy-900">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24 flex flex-col gap-12">
          <h2 className="text-[#f9fafc] text-[28px] font-semibold tracking-[0.56px] text-center">
            What You Can Do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            {[
              { icon: <Truck size={24} className="text-teal-300" />,    title: "Track Orders",  desc: "See the status of every shipment from placement to delivery." },
              { icon: <MapPin size={24} className="text-teal-300" />,   title: "Save Addresses", desc: "Store multiple shipping addresses for fast checkout every time."    },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center gap-5 px-8 sm:px-12 py-10 sm:py-0">
                <div className="w-[50px] h-[50px] rounded-[12px] bg-[rgba(0,193,255,0.2)] flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <h3 className="text-[#f9fafc] text-[16px] font-bold leading-[1.3]">{title}</h3>
                <p className="text-[rgba(255,255,255,0.65)] text-[14px] leading-[1.65]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full bg-neutral-50">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24 flex flex-col gap-12">
          <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] text-center">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ quote, name, practice }) => (
              <div key={name} className="bg-white p-10 flex flex-col gap-5">
                <p className="text-gray-500 text-[14px] leading-[22px] flex-1">{quote}</p>
                <div className="flex flex-col gap-1">
                  <span className="text-navy-900 text-[14px] font-semibold">{name}</span>
                  <span className="text-teal-500 text-[12px] font-medium uppercase tracking-[0.3px]">{practice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Logged-in dashboard ──────────────────────────────────────────────────────

function LoggedInDashboard({
  customer,
  orders,
  addresses,
}: {
  customer:  Customer;
  orders:    CustomerOrder[];
  addresses: CustomerAddress[];
}) {
  const displayName  = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "there";
  const email        = customer.emailAddress?.emailAddress ?? "";
  const phone        = customer.phoneNumber?.phoneNumber ?? null;
  const defaultId    = customer.defaultAddress?.id;

  return (
    <>
      {/* Welcome header */}
      <section className="w-full bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-full bg-navy-900 flex items-center justify-center shrink-0">
              <User size={26} className="text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-navy-900 text-[22px] font-semibold">
                  Welcome back, {customer.firstName ?? "there"}!
                </span>
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-[rgba(0,193,255,0.15)] text-teal-500 text-[12px] font-semibold tracking-[0.3px] uppercase">
                  Active
                </span>
              </div>
              <span className="text-gray-500 text-[15px]">{email}</span>
            </div>
          </div>
          {/* <a> triggers full page navigation so the cookie deletion from the logout route takes effect */}
          <a
            href="/api/auth/logout"
            className="inline-flex items-center gap-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] hover:bg-neutral-50 transition-colors self-start sm:self-auto"
          >
            <LogOut size={16} />
            Log Out
          </a>
        </div>
      </section>

      {/* Dashboard stats */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 grid grid-cols-2 gap-5">
          {[
            { icon: <Package size={20} className="text-teal-500" />, value: String(orders.length),    label: "Total Orders"    },
            { icon: <MapPin  size={20} className="text-teal-500" />, value: String(addresses.length), label: "Saved Addresses" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="bg-white p-6 flex items-center gap-4">
              <div className="w-[44px] h-[44px] rounded-[10px] bg-[rgba(0,193,255,0.12)] flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-navy-900 text-[26px] font-semibold leading-none">{value}</span>
                <span className="text-gray-500 text-[13px] uppercase tracking-[0.3px]">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Orders */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-10">
          <div className="bg-white">
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Recent Orders</h2>
              <Link
                href="/account/orders"
                className="text-teal-500 text-[14px] font-medium hover:underline flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="px-8 py-10 text-gray-500 text-[15px]">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Order #", "Date", "Status", "Total", ""].map((h) => (
                        <th
                          key={h}
                          className="px-8 py-4 text-left text-[12px] font-semibold text-gray-500 uppercase tracking-[0.3px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => {
                      const { label: statusLabel, style: statusStyle } = getFulfillmentDisplay(order.fulfillmentStatus);
                      return (
                        <tr key={order.id} className={i < orders.length - 1 ? "border-b border-gray-200" : ""}>
                          <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">#{order.number}</td>
                          <td className="px-8 py-5 text-gray-500 text-[15px]">{formatDate(order.processedAt)}</td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex px-3 py-1 text-[12px] font-semibold rounded-full ${statusStyle}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">
                            {formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
                          </td>
                          <td className="px-8 py-5">
                            <Link
                              href={`/account/orders/${order.number}`}
                              className="text-teal-500 text-[13px] font-medium hover:underline"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Saved Addresses */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-10">
          <div className="bg-white">
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Saved Addresses</h2>
            </div>
            {addresses.length === 0 ? (
              <p className="px-8 py-10 text-gray-500 text-[15px]">No saved addresses.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-200">
                {addresses.map((addr, i) => (
                  <div key={addr.id} className="bg-white p-8 flex flex-col gap-3">
                    <span className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.3px]">
                      {addressLabel(addr, defaultId, i)}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-navy-900 text-[15px] font-medium">
                        {[addr.address1, addr.address2].filter(Boolean).join(", ")}
                      </span>
                      <span className="text-gray-500 text-[15px]">{formatAddressLine2(addr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Account Settings */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16">
          <div className="bg-white">
            <div className="px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Account Settings</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {([
                { label: "Full Name", value: displayName      },
                { label: "Email",     value: email || "—"     },
                { label: "Password",  value: "••••••••••"     },
                ...(phone ? [{ label: "Phone", value: phone }] : []),
              ] as { label: string; value: string }[]).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-8 py-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-[12px] uppercase tracking-[0.3px]">{label}</span>
                    <span className="text-navy-900 text-[15px] font-medium">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

interface AccountViewProps {
  customer:  Customer | null
  orders:    CustomerOrder[]
  addresses: CustomerAddress[]
}

export function AccountView({ customer, orders, addresses }: AccountViewProps) {
  return (
    <main>
      {customer ? (
        <LoggedInDashboard customer={customer} orders={orders} addresses={addresses} />
      ) : (
        <LoggedOutView />
      )}
    </main>
  );
}
