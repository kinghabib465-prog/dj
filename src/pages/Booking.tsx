import React from "react";
import BookingWizard from "../components/NewBookingWizardV2";
import Layout from "../components/Layout";

const Booking: React.FC = () => {
  return (
    <Layout>
      <section className="bg-white rounded-lg shadow p-6 max-w-3xl mx-auto">
        <h2 className="text-3xl font-semibold mb-4 text-center">نموذج الحجز</h2>
        <BookingWizard />
      </section>
    </Layout>
  );
};

export default Booking;

