import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const Home: React.FC = () => {
  return (
    <Layout>
      <section className="bg-accent text-white py-20 rounded-6 text-center">
        <h1 className="text-5xl font-bold mb-4">مستأجرات الزفاف والفعاليات</h1>
        <p className="text-lg mb-8">نحن نوفر أحدث المعدات الصوتية والضوئية لتجربة لا تُنسى.</p>
        <Link to="/booking" className="bg-white text-accent px-8 py-3 rounded font-semibold hover:bg-gray-200">
          احجز الآن
        </Link>
      </section>
    </Layout>
  );
};

export default Home;

