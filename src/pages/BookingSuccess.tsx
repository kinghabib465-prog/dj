import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const BookingSuccess: React.FC = () => {
  return (
    <Layout>
      <section className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">تم إرسال طلب الحجز بنجاح</h2>
        <p className="mb-6">سيتم مراجعة إيصال الإيداع من قبل المشرف. ستتلقى إشعارًا عند تأكيد الحجز.</p>
        <Link to="/" className="bg-accent text-white px-6 py-3 rounded hover:bg-yellow-600">
          العودة إلى الصفحة الرئيسية
        </Link>
      </section>
    </Layout>
  );
};

export default BookingSuccess;

