import React from "react";
import Layout from "../components/Layout";

const Contact: React.FC = () => {
  return (
    <Layout>
      <section className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto text-gray-900">
        <h2 className="text-3xl font-semibold mb-4 text-center">اتصال بنا</h2>
        <p className="mb-4 text-center">للحجز أو الاستفسار، يرجى التواصل عبر الطرق التالية:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li className="text-lg"><span className="font-bold">الهاتف:</span> [رقم الهاتف]</li>
          <li className="text-lg"><span className="font-bold">واتساب:</span> [رقم الواتساب]</li>
          <li className="text-lg"><span className="font-bold">العنوان:</span> [العنوان]</li>
        </ul>
      </section>
    </Layout>
  );
};

export default Contact;

