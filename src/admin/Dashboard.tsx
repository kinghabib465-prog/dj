import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Package, Truck, ArrowLeftFromLine, LogOut } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">
            لوحة تحكم المشرف
          </h1>
          <Link
            to="/admin/login"
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut className="mr-1 w-5 h-5" />
            تسجيل الخروج
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin/returns"
            className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition"
          >
            <Package className="w-12 h-12 text-accent mb-3" />
            <span className="text-lg font-medium text-gray-800">
              المعدات الخارجة
            </span>
          </Link>
          <Link
            to="/admin/equipment-inside"
            className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition"
          >
            <Truck className="w-12 h-12 text-green-600 mb-3" />
            <span className="text-lg font-medium text-gray-800">
              المعدات داخل المتجر
            </span>
          </Link>
          <Link
            to="/admin/equipment-outside"
            className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition"
          >
            <ArrowLeftFromLine className="w-12 h-12 text-indigo-600 mb-3" />
            <span className="text-lg font-medium text-gray-800">
              المعدات خارج المتجر
            </span>
          </Link>
          <Link
            to="/admin/calendar"
            className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition"
          >
            <Calendar className="w-12 h-12 text-purple-600 mb-3" />
            <span className="text-lg font-medium text-gray-800">
              تقويم الحجوزات
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}

