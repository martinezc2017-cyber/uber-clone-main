import AdminShell from "@/components/admin/AdminShell";
import { Slot } from "expo-router";

export default function AdminLayout() {
  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}
