// src/admin/Dashboard.tsx
import React from "react";
import { Link } from "react-router-dom";

const AdminDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-4">لوحة تحكم المشرف</h2>
      <nav className="grid grid-cols-2 gap-4">
        <Link to="/admin/returns" className="bg-blue-600 text-white p-4 rounded text-center">المعدات الخارجة</Link>
        <Link to="/admin/equipment-inside" className="bg-green-600 text-white p-4 rounded text-center">المعدات داخل المتجر</Link>
        <Link to="/admin/equipment-outside" className="bg-indigo-600 text-white p-4 rounded text-center">المعدات خارج المتجر</Link>
        <Link to="/admin/calendar" className="bg-purple-600 text-white p-4 rounded text-center">تقويم الحجوزات</Link>
      </nav>
    </div>
  );
};

export default AdminDashboard;

