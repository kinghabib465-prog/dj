import React from "react";
import { Link } from "react-router-dom";

const BookingSuccess: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-4">تم إرسال طلب الحجز بنجاح</h2>
      <p className="mb-6">سيتم مراجعة إيصال الإيداع من قبل المشرف. ستتلقى إشعارًا عند تأكيد الحجز.</p>
      <Link to="/" className="bg-accent text-white px-4 py-2 rounded hover:bg-yellow-600">
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
};

export default BookingSuccess;
