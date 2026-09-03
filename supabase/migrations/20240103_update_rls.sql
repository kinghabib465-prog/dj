-- 20240103_update_rls.sql

-- Drop previous admin policies that used auth.role()
DROP POLICY IF EXISTS admin_business_settings ON business_settings;
DROP POLICY IF EXISTS admin_equipment ON equipment;
DROP POLICY IF EXISTS admin_categories ON equipment_categories;
DROP POLICY IF EXISTS admin_bookings ON bookings;
DROP POLICY IF EXISTS admin_booking_items ON booking_items;

-- Create admin policies using is_admin()
CREATE POLICY "admin_business_settings" ON business_settings FOR ALL USING (is_admin());
CREATE POLICY "admin_equipment" ON equipment FOR ALL USING (is_admin());
CREATE POLICY "admin_categories" ON equipment_categories FOR ALL USING (is_admin());
CREATE POLICY "admin_bookings" ON bookings FOR ALL USING (is_admin());
CREATE POLICY "admin_booking_items" ON booking_items FOR ALL USING (is_admin());
