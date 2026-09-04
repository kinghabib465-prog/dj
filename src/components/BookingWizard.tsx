import React, { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * نموذج حجز كامل وتفاعلي.
 * يستخدم Tailwind لتصميم جذاب ويُرسل البيانات إلى Supabase.
 */
const BookingWizard: React.FC = () => {
  // حقول النموذج
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [equipment, setEquipment] = useState("");
  const [date, setDate] = useState("");

  // حالة التحميل والنتائج
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // قائمة المعدات (يمكن استبدالها بقراءة من Supabase إذا أردت)
  const equipmentOptions = [
    { id: "camera", label: "كاميرا احترافية" },
    { id: "lights", label: "مجموعة إضاءة" },
    { id: "sound", label: "نظام صوتي" },
    { id: "stage", label: "منصة صغيرة" },
  ];

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setEquipment("");
    setDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // تحقق بسيط من صحة الإدخال
    if (!name || !email || !phone || !equipment || !date) {
      setErrorMsg("الرجاء ملء جميع الحقول.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            name,
            email,
            phone,
            equipment,
            rental_start_at: date,
            expected_return_at: date,
            status: "PENDING_PAYMENT_REVIEW",
          },
        ])
        .single();

      if (error) throw error;

      setSuccessMsg("✅ تم حجزك بنجاح! سيتم مراجعة طلبك قريبًا.");
      resetForm();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message ?? "حدث خطأ غير متوقع أثناء حفظ الحجز. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-white text-gray-800 p-6 rounded-lg shadow-lg space-y-4"
    >
      {/* عنوان النموذج */}
      <h2 className="text-2xl font-bold text-center text-white mb-4">
        حجز معدات الزفاف والفعاليات
      </h2>

      {/* رسائل النجاح / الخطأ */}
      {successMsg && (
        <p className="text-green-400 text-center font-medium">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-red-400 text-center font-medium">{errorMsg}</p>
      )}

      {/* الحقول */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* الاسم */}
        <div>
          <label className="block text-gray-800 mb-1">الاسم الكامل</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="مثال: محمد علي"
            required
          />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <label className="block text-gray-800 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="example@domain.com"
            required
          />
        </div>

        {/* رقم الهاتف */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">رقم الهاتف</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="مثال: 0591234567"
            required
          />
        </div>

        {/* اختيار المعدات */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">المعدات المطلوبة</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="">-- اختر المعدات --</option>
            {equipmentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* تاريخ الحجز */}
        <div className="md:col-span-2">
          <label className="block text-gray-800 mb-1">تاريخ الحجز</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>
      </div>

      {/* زر الإرسال */}
      <div className="text-center mt-4">
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-accent hover:bg-yellow-600"
          }`}
        >
          {loading ? "جاري الإرسال…" : "إرسال الحجز"}
        </button>
      </div>
    </form>
  );
};

export default BookingWizard;
