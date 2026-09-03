// src/__tests__/admin_pages.test.ts
import { test, expect } from "vitest";
import ReturnsList from "../admin/ReturnsList";
import ReturnsDetail from "../admin/ReturnsDetail";
import EquipmentInside from "../admin/EquipmentInside";
import EquipmentOutside from "../admin/EquipmentOutside";
import Calendar from "../admin/Calendar";

test("Admin components are defined", () => {
  expect(typeof ReturnsList).toBe("function");
  expect(typeof ReturnsDetail).toBe("function");
  expect(typeof EquipmentInside).toBe("function");
  expect(typeof EquipmentOutside).toBe("function");
  expect(typeof Calendar).toBe("function");
});
