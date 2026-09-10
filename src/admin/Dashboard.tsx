import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  ArrowLeftFromLine,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import AdminLayout from "../components/AdminLayout";

interface Stat {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  to: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState({ total: 0, month: 0, completed: 0 });

  useEffect(() => {
    const load = async () => {
      const [pending, confirmed, out, returns] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "PENDING_PAYMENT_REVIEW"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "CONFIRMED"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "EQUIPMENT_OUT"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "RETURN_PENDING"),
      ]);
      const { data: pays } = await supabase
        .from("payments")
        .select("amount,created_at")
        .eq("status", "VERIFIED");
      const all = (pays || []) as { amount: number; created_at: string }[];
      const monthPrefix = new Date().toISOString().slice(0, 7);
      const totalRev = all.reduce((s, p) => s + (p.amount || 0), 0);
      const monthRev = all
        .filter((p) => (p.created_at || "").slice(0, 7) === monthPrefix)
        .reduce((s, p) => s + (p.amount || 0), 0);
      const { count: completedCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED");
      setRevenue({ total: totalRev, month: monthRev, completed: completedCount ?? 0 });

      setStats([
        {
          label: "بانتظار الدفع",
          value: pending.count ?? 0,
          icon: <Clock size={24} />,
          color: "text-warning",
          to: "/admin/bookings",
        },
        {
          label: "مؤكد — جاهز للتسليم",
          value: confirmed.count ?? 0,
          icon: <CheckCircle2 size={24} />,
          color: "text-success",
          to: "/admin/bookings",
        },
        {
          label: "معدات عند الزبون",
          value: out.count ?? 0,
          icon: <Package size={24} />,
          color: "text-info",
          to: "/admin/equipment-outside",
        },
        {
          label: "بانتظار الإرجاع",
          value: returns.count ?? 0,
          icon: <AlertCircle size={24} />,
          color: "text-purple-400",
          to: "/admin/returns",
        },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm text-gray-400">نظرة عامة على حالة الحجوزات والمعدات</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/40 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className={s.color}>{s.icon}</span>
                <span className="text-3xl font-bold">{s.value}</span>
              </div>
              <p className="mt-3 text-sm text-gray-400 group-hover:text-gray-300">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
          <div className="flex items-center justify-between">
            <DollarSign className="text-accent" size={24} />
            <span className="text-2xl font-bold text-accent">{revenue.total.toLocaleString("en-US")}</span>
          </div>
          <p className="mt-3 text-sm text-gray-300">إجمالي الإيرادات المحصلة (دج)</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <div className="flex items-center justify-between">
            <TrendingUp className="text-success" size={24} />
            <span className="text-2xl font-bold text-success">{revenue.month.toLocaleString("en-US")}</span>
          </div>
          <p className="mt-3 text-sm text-gray-300">إيرادات هذا الشهر (دج)</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="text-gray-300" size={24} />
            <span className="text-2xl font-bold">{revenue.completed}</span>
          </div>
          <p className="mt-3 text-sm text-gray-300">حجوزات مكتملة</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QuickLink
          to="/admin/returns"
          title="المعدات الخارجة"
          desc="عرض الحجوزات النشطة وتسجيل الإرجاع"
          icon={<Package size={28} className="text-accent" />}
        />
        <QuickLink
          to="/admin/equipment-inside"
          title="مخزون المتجر"
          desc="حالة المعدات المتاحة داخل المتجر"
          icon={<Truck size={28} className="text-success" />}
        />
        <QuickLink
          to="/admin/equipment-outside"
          title="المعدات خارج المتجر"
          desc="كل المعدات المسلمة مع تواريخ الإرجاع المتوقعة"
          icon={<ArrowLeftFromLine size={28} className="text-info" />}
        />
        <QuickLink
          to="/admin/calendar"
          title="تقويم الحجوزات"
          desc="عرض الحجوزات حسب التاريخ"
          icon={<CalendarDays size={28} className="text-purple-400" />}
        />
      </div>
    </AdminLayout>
  );
}

function QuickLink({
  to,
  title,
  desc,
  icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/40 hover:bg-white/10"
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-400">{desc}</p>
      </div>
    </Link>
  );
}

