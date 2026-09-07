import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const BookingSuccess: React.FC = () => {
  return (
    <Layout>
      <section className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto text-center text-gray-900">
        <h2 className="text-3xl font-bold mb-4">تم إرسال طلب الحجز بنجاح</h2>
        <p className="mb-6">سيتم مراجعة إيصال الإيداع من قبل المشرف. ستتلقى إشعارًا عند تأكيد الحجز.</p>
        <Link to="/" className="bg-accent text-gray-900 px-6 py-3 rounded font-semibold hover:bg-accent/90">
          العودة إلى الصفحة الرئيسية
        </Link>
      </section>
    </Layout>
  );
};

export default BookingSuccess;

