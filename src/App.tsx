import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Equipment from "./pages/Equipment";
import Booking from "./pages/Booking";
import BookingSuccess from "./pages/BookingSuccess";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./admin/Dashboard";
import BookingsList from "./admin/BookingsList";
import BookingDetail from "./admin/BookingDetail";
import ReturnsList from "./admin/ReturnsList";
import ReturnsDetail from "./admin/ReturnsDetail";
import EquipmentInside from "./admin/EquipmentInside";
import EquipmentOutside from "./admin/EquipmentOutside";
import Calendar from "./admin/Calendar";
import TrashList from "./admin/TrashList";
import EquipmentAdd from "./admin/EquipmentAdd";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/equipment" element={<Equipment />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/booking/success" element={<BookingSuccess />} />
      <Route path="/contact" element={<Contact />} />
      {/* Admin routes – login */}
      <Route path="/admin/login" element={<AdminLogin />} />
      {/* Protected admin routes */}
      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<BookingsList />} />
        <Route path="/admin/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/admin/booking/:bookingId" element={<BookingDetail />} />
        <Route path="/admin/returns" element={<ReturnsList />} />
        <Route path="/admin/returns/:bookingId" element={<ReturnsDetail />} />
        <Route path="/admin/equipment-inside" element={<EquipmentInside />} />
        <Route path="/admin/equipment-outside" element={<EquipmentOutside />} />
        <Route path="/admin/calendar" element={<Calendar />} />
        <Route path="/admin/equipment/add" element={<EquipmentAdd />} />
        <Route path="/admin/trash" element={<TrashList />} />
      </Route>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
