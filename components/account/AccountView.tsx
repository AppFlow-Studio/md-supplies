"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, Truck, MapPin, FileText, Star,
  Package, ChevronRight, LogOut, User,
} from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USER = {
  firstName: "Sarah",
  lastName: "Mitchell",
  email: "sarah.mitchell@urgentcare.com",
  practice: "Urgent Care Director",
};

const MOCK_ORDERS = [
  { id: "MD-10482", date: "May 15, 2026", status: "Delivered",   total: "$384.00"   },
  { id: "MD-10391", date: "May 3, 2026",  status: "Shipped",     total: "$1,240.50" },
  { id: "MD-10287", date: "Apr 22, 2026", status: "Delivered",   total: "$562.75"   },
  { id: "MD-10194", date: "Apr 8, 2026",  status: "Processing",  total: "$210.00"   },
];

const MOCK_ADDRESSES = [
  { label: "Primary Clinic",      line1: "1245 Healthcare Blvd, Suite 200", city: "Austin, TX 78701"    },
  { label: "Secondary Location",  line1: "850 Medical Center Dr",           city: "Houston, TX 77030"   },
];

const STATUS_STYLES: Record<string, string> = {
  Delivered:  "bg-green-100 text-green-700",
  Shipped:    "bg-blue-100 text-blue-700",
  Processing: "bg-yellow-100 text-yellow-700",
};

// ─── Modal base ───────────────────────────────────────────────────────────────

function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

function LoginModal({
  onClose,
  onLoggedIn,
  onSwitchToCreate,
}: {
  onClose: () => void;
  onLoggedIn: () => void;
  onSwitchToCreate: () => void;
}) {
  useEscapeKey(onClose);

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.2)] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-w-[540px] w-full bg-white px-8 sm:px-12 py-10 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-navy-900 hover:text-teal-500 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-8">
          Log In
        </h2>

        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); onLoggedIn(); onClose(); }}>

          <div className="flex flex-col gap-2">
            <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={MOCK_USER.email}
              className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
                Password
              </label>
              <Link href="/forgot-password" className="text-teal-500 text-[13px] font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              defaultValue="password"
              className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="bg-navy-900 text-white h-[59px] text-[20px] font-semibold hover:bg-navy-950 transition-colors mt-1"
          >
            Log In
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-500 text-[14px]">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            className="border border-navy-900 bg-white h-[59px] text-[20px] font-semibold text-navy-900 hover:bg-neutral-50 transition-colors"
          >
            Continue with Google
          </button>

          <p className="text-center text-gray-500 text-[14px]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => { onClose(); onSwitchToCreate(); }}
              className="text-teal-500 font-medium hover:underline"
            >
              Create one
            </button>
          </p>

        </form>
      </div>
    </div>
  );
}

// ─── Create Account Modal ─────────────────────────────────────────────────────

function CreateAccountModal({
  onClose,
  onSwitchToLogin,
}: {
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  useEscapeKey(onClose);

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.2)] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-w-[580px] w-full bg-white px-8 sm:px-12 py-10 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-navy-900 hover:text-teal-500 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-navy-900 text-[28px] font-semibold tracking-[0.56px] mb-8">
          Create Account
        </h2>

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
                First Name
              </label>
              <input
                type="text"
                className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
                Last Name
              </label>
              <input
                type="text"
                className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
              Email Address
            </label>
            <input
              type="email"
              className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
              Password
            </label>
            <input
              type="password"
              className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-navy-900 text-[15px] font-medium tracking-[0.32px] uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              className="border border-navy-900 h-[53px] px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 shrink-0 accent-navy-900" />
            <span className="text-gray-500 text-[14px] leading-[1.6]">
              I agree to MDSupplies{" "}
              <Link href="/terms" className="text-teal-500 hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-teal-500 hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <button
            type="submit"
            className="bg-navy-900 text-white h-[59px] text-[20px] font-semibold hover:bg-navy-950 transition-colors mt-1"
          >
            Create Account
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-500 text-[14px]">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            className="border border-navy-900 bg-white h-[59px] text-[20px] font-semibold text-navy-900 hover:bg-neutral-50 transition-colors"
          >
            Continue with Google
          </button>

          <p className="text-center text-gray-500 text-[14px]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { onClose(); onSwitchToLogin(); }}
              className="text-teal-500 font-medium hover:underline"
            >
              Log In
            </button>
          </p>

        </form>
      </div>
    </div>
  );
}

// ─── Logged-out view ──────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "MD Supplies has completely streamlined our clinic's ordering process. Same-day shipping means we're never caught short on supplies.",
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

function LoggedOutView({
  onLoginClick,
  onCreateClick,
}: {
  onLoginClick: () => void;
  onCreateClick: () => void;
}) {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        {/* Background image — right ~67% on desktop, full-width on mobile */}
        <div className="relative w-full h-[280px] sm:h-[420px] lg:absolute lg:inset-0 lg:left-[33%] lg:h-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/doc_with_ipad.jpg"
            alt="Healthcare professional using a tablet"
            className="absolute inset-0 w-[80%] h-full object-center"
            loading="eager"
          />
        </div>

        {/* White content card */}
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
            <button
              onClick={onLoginClick}
              className="inline-flex items-center justify-center bg-navy-900 text-white text-[20px] font-semibold h-[59px] px-10 hover:bg-navy-950 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center justify-center border border-navy-900 text-navy-900 text-[20px] font-semibold h-[59px] px-10 hover:bg-neutral-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Desktop height spacer so the image fills the section */}
        <div className="hidden lg:block h-[140px]" />
      </section>

      {/* Trusted By */}
      <section className="w-full bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex flex-col items-center gap-5">
          <p className="text-gray-500 text-[18px] font-medium uppercase tracking-[0.36px] text-center">
            Trusted by Healthcare Providers Across the US
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {["Urgent Care", "HRT Clinics", "Home Health", "Long-Term Care", "Clinics", "First Responder"].map((label, i, arr) => (
              <span key={label} className="flex items-center gap-3">
                <span className="text-navy-900 text-[15px] font-medium uppercase tracking-[0.3px]">{label}</span>
                {i < arr.length - 1 && <span className="text-gray-200 text-[18px] select-none">›</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { value: "1,000+",   label: "Active Accounts" },
            { value: "4,000+",   label: "Products" },
            { value: "Same-Day", label: "Fulfillment" },
            { value: "24-48 hr", label: "Fast Support" },
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
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            {[
              { icon: <Truck size={24} className="text-teal-300" />,    title: "Track Orders",    desc: "See real-time status on every shipment from placement to delivery." },
              { icon: <MapPin size={24} className="text-teal-300" />,   title: "Save Addresses",  desc: "Store multiple shipping addresses for fast checkout every time." },
              { icon: <FileText size={24} className="text-teal-300" />, title: "View Invoices",   desc: "Access and download invoices for your records and accounting." },
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
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" strokeWidth={0} className="text-yellow-400" />
                  ))}
                </div>
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

function LoggedInDashboard({ onLogout }: { onLogout: () => void }) {
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
                  Welcome back, {MOCK_USER.firstName}!
                </span>
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-[rgba(0,193,255,0.15)] text-teal-500 text-[12px] font-semibold tracking-[0.3px] uppercase">
                  Active
                </span>
              </div>
              <span className="text-gray-500 text-[15px]">{MOCK_USER.email}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] hover:bg-neutral-50 transition-colors self-start sm:self-auto"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </section>

      {/* Dashboard stats */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {[
            { icon: <Package size={20} className="text-teal-500" />,  value: "12",  label: "Total Orders"     },
            { icon: <MapPin size={20} className="text-teal-500" />,   value: "2",   label: "Saved Addresses"  },
            { icon: <FileText size={20} className="text-teal-500" />, value: "8",   label: "Invoices"         },
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
            {/* Table header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Recent Orders</h2>
              <button className="text-teal-500 text-[14px] font-medium hover:underline flex items-center gap-1">
                View All <ChevronRight size={14} />
              </button>
            </div>

            {/* Table */}
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
                  {MOCK_ORDERS.map((order, i) => (
                    <tr key={order.id} className={i < MOCK_ORDERS.length - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">{order.id}</td>
                      <td className="px-8 py-5 text-gray-500 text-[15px]">{order.date}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex px-3 py-1 text-[12px] font-semibold rounded-full ${STATUS_STYLES[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">{order.total}</td>
                      <td className="px-8 py-5">
                        <button className="text-teal-500 text-[13px] font-medium hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Saved Addresses */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-10">
          <div className="bg-white">
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Saved Addresses</h2>
              <button className="text-teal-500 text-[14px] font-medium hover:underline">
                + Add New
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-200">
              {MOCK_ADDRESSES.map((addr) => (
                <div key={addr.label} className="bg-white p-8 flex flex-col gap-3">
                  <span className="text-teal-500 text-[12px] font-semibold uppercase tracking-[0.3px]">
                    {addr.label}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-navy-900 text-[15px] font-medium">{addr.line1}</span>
                    <span className="text-gray-500 text-[15px]">{addr.city}</span>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <button className="text-navy-900 text-[13px] font-medium hover:text-teal-500 transition-colors">
                      Edit
                    </button>
                    <button className="text-gray-500 text-[13px] font-medium hover:text-red-500 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Account Settings teaser */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16">
          <div className="bg-white">
            <div className="px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Account Settings</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {[
                { label: "Full Name",    value: `${MOCK_USER.firstName} ${MOCK_USER.lastName}` },
                { label: "Email",        value: MOCK_USER.email                                },
                { label: "Password",     value: "••••••••••"                                   },
                { label: "Practice",     value: MOCK_USER.practice                             },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-8 py-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-[12px] uppercase tracking-[0.3px]">{label}</span>
                    <span className="text-navy-900 text-[15px] font-medium">{value}</span>
                  </div>
                  <button className="text-teal-500 text-[13px] font-medium hover:underline shrink-0">
                    Edit
                  </button>
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

export function AccountView() {
  const [isLoggedIn,      setIsLoggedIn]      = useState(false);
  const [loginModalOpen,  setLoginModalOpen]  = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <>
      <main>
        {isLoggedIn ? (
          <LoggedInDashboard onLogout={() => setIsLoggedIn(false)} />
        ) : (
          <LoggedOutView
            onLoginClick={() => setLoginModalOpen(true)}
            onCreateClick={() => setCreateModalOpen(true)}
          />
        )}
      </main>

      {loginModalOpen && (
        <LoginModal
          onClose={() => setLoginModalOpen(false)}
          onLoggedIn={() => setIsLoggedIn(true)}
          onSwitchToCreate={() => setCreateModalOpen(true)}
        />
      )}

      {createModalOpen && (
        <CreateAccountModal
          onClose={() => setCreateModalOpen(false)}
          onSwitchToLogin={() => setLoginModalOpen(true)}
        />
      )}
    </>
  );
}
