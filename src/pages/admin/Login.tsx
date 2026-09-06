import React, { useState } from "react";
import { User, Lock } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError("الرجاء ملء جميع الحقول");
      return;
    }
    setLoading(true);
    try {
      // TODO: استبدل هذا بطلب تسجيل الدخول الفعلي إلى الخادم
      console.log("تسجيل الدخول كـ", username);
      // محاكاة تأخير
      await new Promise((r) => setTimeout(r, 500));
      // بعد نجاح تسجيل الدخول، يمكنك توجيه المستخدم إلى لوحة التحكم
      // مثال: window.location.href = "/admin/dashboard";
    } catch (e) {
      setError("فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-4">دخول الأدمن</h2>
        {error && <p className="text-red-600 mb-3 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center border rounded px-3 py-2">
            <User className="mr-2 text-gray-500" />
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
          <div className="flex items-center border rounded px-3 py-2">
            <Lock className="mr-2 text-gray-500" />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2 rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "جاري الدخول…" : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
