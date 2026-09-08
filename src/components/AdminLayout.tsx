import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  ArrowLeftFromLine,
  CalendarDays,
  LogOut,
  Menu,
  X,
  PackagePlus,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/admin/bookings", label: "الحجوزات", icon: ClipboardList },
  { to: "/admin/returns", label: "المعدات الخارجة", icon: Package },
  { to: "/admin/equipment-inside", label: "داخل المتجر", icon: Truck },
  { to: "/admin/equipment-outside", label: "خارج المتجر", icon: ArrowLeftFromLine },
  { to: "/admin/calendar", label: "التقويم", icon: CalendarDays },
  { to: "/admin/equipment/add", label: "إضافة معدة", icon: PackagePlus },
  { to: "/admin/trash", label: "سلة المحذوفات", icon: Trash2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const navContent = (
    <nav className="mt-6 flex flex-col gap-1 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/admin/dashboard"}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-accent/15 text-accent"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <item.icon size={20} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white" dir="rtl">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="القائمة">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="text-lg font-bold text-accent">تأجير التجهيزات</span>
        <button onClick={handleLogout} className="text-gray-400">
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 right-0 z-30 w-64 transform border-l border-white/10 bg-gray-900 transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-4">
              <h1 className="text-lg font-bold text-accent">تأجير التجهيزات</h1>
              <p className="text-xs text-gray-500">لوحة تحكم المشرف</p>
            </div>
            {navContent}
            <div className="mt-auto border-t border-white/10 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <LogOut size={20} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-h-screen flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}