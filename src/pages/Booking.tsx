import React from "react";
import BookingWizard from "../components/BookingWizard";

const Booking: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-semibold mb-4">نموذج الحجز</h2>
      <BookingWizard />
    </div>
  );
};

export default Booking;
