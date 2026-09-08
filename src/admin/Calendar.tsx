import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  CalendarDays,
  Eye,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface BookingEvent {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  rental_start_at: string;
  expected_return_at: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "بانتظار مراجعة الدفع",
  CONFIRMED: "مؤكد",
  READY_FOR_PICKUP: "جاهز للتسليم",
  EQUIPMENT_OUT: "معدات مسلمة",
  RETURN_PENDING: "بانتظار الإرجاع",
  COMPLETED: "مكتمل",
  PAYMENT_REJECTED: "دفع مرفوض",
  CANCELLED: "ملغي",
  EXPIRED: "منتهي",
};

const STATUS_CHIP: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "bg-warning text-gray-900",
  CONFIRMED: "bg-success text-white",
  READY_FOR_PICKUP: "bg-info text-white",
  EQUIPMENT_OUT: "bg-blue-500 text-white",
  RETURN_PENDING: "bg-purple-500 text-white",
  COMPLETED: "bg-gray-500 text-white",
  PAYMENT_REJECTED: "bg-red-500 text-white",
  CANCELLED: "bg-gray-700 text-gray-300",
  EXPIRED: "bg-gray-700 text-gray-300",
};

const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const MONTHS_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function Calendar() {
  const [current, setCurrent] = useState(() => new Date());
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("bookings")
      .select("id,booking_number,customer_name,customer_phone,rental_start_at,expected_return_at,status")
      .order("rental_start_at", { ascending: true });
    if (error || !data) {
      setBookings([]);
      setError("تعذر تحميل الحجوزات، تحقق من الاتصال ثم أعد المحاولة.");
    } else {
      setBookings(data as BookingEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const map = useMemo(() => {
    const m: Record<string, { b: BookingEvent; dayKey: string }[]> = {};
    for (const b of bookings) {
      const s = new Date(b.rental_start_at);
      const e = new Date(b.expected_return_at);
      const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const last = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      while (cur <= last) {
        const key = toKey(cur);
        if (!m[key]) m[key] = [];
        m[key].push({ b, dayKey: key });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return m;
  }, [bookings]);

  const y = current.getFullYear();
  const m = current.getMonth();
  const firstDay = new Date(y, m, 1);
  const offset = (firstDay.getDay() + 1) % 7; // Saturday-based
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(y, m, i + 1))),
  ];
  while ((cells.length % 7) !== 0) cells.push(null);

  const monthMemo = `${MONTHS_AR[m]} ${y}`;
  const todayKey = toKey(new Date());

  const prevMonth = () => { setCurrent(new Date(y, m - 1, 1)); setSelected(null); };
  
  const nextMonth = () => { setCurrent(new Date(y, m + 1, 1)); setSelected(null); };

  const selectedEvents = selected ? (map[selected] ?? []) : [];

  
  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تقويم الحجوزات</h1>
          <p className="mt-1 text-sm text-gray-400">عرض الحجوزات حسب تاريخ الإيجار</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
          <button onClick={handleRefresh} className="mr-2 font-semibold underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Calendar card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-gray-300 transition hover:bg-white/5"
            aria-label="الشهر السابق"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-lg font-bold sm:text-xl">{monthMemo}</h2>
          <button
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-gray-300 transition hover:bg-white/5"
            aria-label="الشهر التالي"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Weekday header */}
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-semibold text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((key, idx) => {
              if (!key) return <div key={`empty-${idx}`} className="min-h-[72px] rounded-lg" />;
              const dayEvents = map[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const isPast = fmtDay(key).getTime() < new Date(todayKey).getTime();
              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`flex min-h-[72px] flex-col items-start gap-1 rounded-lg border p-1.5 text-right transition sm:p-2 ${
                    isSelected
                      ? "border-accent bg-accent/10"
                      : isToday
                      ? "border-accent/50 bg-white/5"
                      : "border-white/5 bg-white/5"
                  } ${isPast ? "opacity-60" : ""} hover:border-accent/40`}
                >
                  <span className={`text-xs font-bold ${isToday ? "text-accent" : "text-gray-300"}`}>
                    {fmtDay(key).getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {dayEvents.slice(0, 2).map(({ b }) => (
                        <span
                          key={b.id}
                          title={b.booking_number}
                          className={`rounded-md px-1 py-0.5 text-[9px] font-bold leading-none ${STATUS_CHIP[b.status] ?? "bg-gray-700 text-gray-300"}`}
                        >
                          {b.booking_number}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="rounded-md bg-white/10 px-1 py-0.5 text-[9px] font-bold leading-none text-gray-400">
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day details */}
      {selected && !loading && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <CalendarDays size={18} className="text-accent" />
            حجوزات يوم {fmtDay(selected).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد حجوزات في هذا اليوم.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(({ b }) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/admin/bookings/${b.id}`)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                >
                  <div>
                    <p className="font-semibold">{b.customer_name || "—"}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {b.booking_number} — {b.customer_phone || "بدون هاتف"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[b.status] ?? "bg-gray-700 text-gray-300"}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <Eye size={14} />
                      التفاصيل
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_LABELS).slice(0, 6).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CHIP[k] ?? "bg-gray-700"}`} />
              {v}
            </span>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}



