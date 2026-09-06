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
      // TODO: Replace with real authentication request
      console.log("تسجيل الدخول كـ", username);
      await new Promise((r) => setTimeout(r, 500));
      // Redirect after successful login
      window.location.href = "/admin/dashboard";
    } catch (e) {
      setError("فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">دخول الأدمن</h2>
        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-accent">
            <User className="mr-2 text-gray-500" />
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-accent">
            <Lock className="mr-2 text-gray-500" />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 outline-none bg-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2 rounded-md hover:bg-accent/90 disabled:opacity-50 transition"
          >
            {loading ? "جاري الدخول…" : "تسجيل الدخول"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-accent hover:underline">
            العودة إلى الصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
