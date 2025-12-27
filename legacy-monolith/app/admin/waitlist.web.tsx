// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { SwissColors } from "@/constants/theme";
import { fetchAPI, useFetch } from "@/lib/fetch";
import { DriverWaitlistEntry } from "@/types/type";

const statusOptions = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
  { value: "all", label: "Todos" },
];

const statusBadge = (status?: string) => {
  const base = {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start" as const,
    borderWidth: 1,
  };
  if (status === "approved") return { ...base, backgroundColor: "#ecfeff", borderColor: "#67e8f9" };
  if (status === "rejected") return { ...base, backgroundColor: "#fef2f2", borderColor: "#fecdd3" };
  return { ...base, backgroundColor: "#fffbeb", borderColor: "#fef3c7" };
};

export default function AdminDriverWaitlist() {
  const [filter, setFilter] = useState("pending");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const endpoint = useMemo(
    () => `/api/driver/waitlist${filter === "all" ? "" : `?status=${filter}`}`,
    [filter],
  );

  const { data, loading, error, refetch } = useFetch<DriverWaitlistEntry[]>(endpoint);

  useEffect(() => {
    if (!data) return;
    const next: Record<number, string> = {};
    data.forEach((item) => {
      if (item?.id != null) next[item.id] = item.notes ?? "";
    });
    setNotes(next);
  }, [data]);

  const updateEntry = async (
    entry: DriverWaitlistEntry,
    status: "approved" | "rejected" | "pending",
    promote = false,
  ) => {
    if (!entry.id) return;
    setSavingId(entry.id);
    try {
      await fetchAPI(`/api/driver/waitlist/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes[entry.id] ?? "",
          promote_to_driver: promote,
        }),
      });
      await refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo actualizar el registro.");
    } finally {
      setSavingId(null);
    }
  };

  const removeEntry = async (entry: DriverWaitlistEntry) => {
    if (!entry.id) return;
    const ok = typeof window !== "undefined"
      ? window.confirm(`Eliminar a ${entry.first_name} ${entry.last_name}?`)
      : true;
    if (!ok) return;

    setSavingId(entry.id);
    try {
      await fetchAPI(`/api/driver/waitlist/${entry.id}`, { method: "DELETE" });
      await refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo eliminar.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, gap: 14 }}
        style={{ flex: 1 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 20, color: SwissColors.textPrimary, fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif" }}>
              Driver waitlist
            </Text>
            <Text style={{ color: SwissColors.textSecondary, marginTop: 4, fontSize: 13 }}>
              Gestiona postulantes y crea el perfil de driver en un clic.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {statusOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setFilter(opt.value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: filter === opt.value ? "#0ea5e9" : SwissColors.border,
                  backgroundColor: filter === opt.value ? "#e0f2fe" : "#fff",
                }}
              >
                <Text
                  style={{
                    color: filter === opt.value ? "#0f172a" : SwissColors.textSecondary,
                    fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fef2f2", borderColor: "#fecdd3", borderWidth: 1 }}>
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text>
          </View>
        ) : (data ?? []).length === 0 ? (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", borderColor: SwissColors.border, borderWidth: 1 }}>
            <Text style={{ color: SwissColors.textSecondary, fontSize: 13 }}>
              No hay registros para este estado.
            </Text>
          </View>
        ) : (
          <View style={{ display: "flex", gap: 12 }}>
            {(data ?? []).map((entry) => (
              <View
                key={entry.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: SwissColors.border,
                  padding: 14,
                  boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ color: SwissColors.textPrimary, fontSize: 16, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
                      {entry.first_name} {entry.last_name}
                    </Text>
                    <Text style={{ color: SwissColors.textSecondary, fontSize: 13 }}>
                      {entry.email} · {entry.phone || "Sin teléfono"}
                    </Text>
                  </View>
                  <View style={statusBadge(entry.status)}>
                    <Text style={{ fontSize: 12, color: "#0f172a", fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }}>
                      {entry.status ?? "pending"}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                  <Badge label="Ciudad" value={entry.city || "--"} />
                  <Badge label="Vehículo" value={entry.vehicle || "--"} />
                  <Badge label="Experiencia" value={entry.experience_years != null ? `${entry.experience_years} años` : "--"} />
                  <Badge label="Fuente" value={entry.source || "app"} />
                  <Badge label="Creado" value={entry.created_at?.slice(0, 19) || "--"} />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    placeholder="Notas internas"
                    placeholderTextColor={SwissColors.textMuted}
                    value={entry.id ? notes[entry.id] ?? entry.notes ?? "" : ""}
                    onChangeText={(v) => entry.id && setNotes((prev) => ({ ...prev, [entry.id as number]: v }))}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: SwissColors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "#f8fafc",
                    }}
                  />
                  <Pressable
                    onPress={() => entry.id && setNotes((prev) => ({ ...prev, [entry.id as number]: entry.notes || "" }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#e2e8f0" }}
                  >
                    <Text style={{ color: "#0f172a", fontSize: 12 }}>Reset</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <ActionButton
                    label="Aprobar"
                    onPress={() => updateEntry(entry, "approved")}
                    loading={savingId === entry.id}
                    variant="success"
                  />
                  <ActionButton
                    label="Aprobar y crear driver"
                    onPress={() => updateEntry(entry, "approved", true)}
                    loading={savingId === entry.id}
                    variant="primary"
                  />
                  <ActionButton
                    label="Rechazar"
                    onPress={() => updateEntry(entry, "rejected")}
                    loading={savingId === entry.id}
                    variant="warning"
                  />
                  <ActionButton
                    label="Eliminar"
                    onPress={() => removeEntry(entry)}
                    loading={savingId === entry.id}
                    variant="danger"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const Badge = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: "#f8fafc",
      borderWidth: 1,
      borderColor: SwissColors.border,
    }}
  >
    <Text style={{ color: SwissColors.textSecondary, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
    <Text style={{ color: SwissColors.textPrimary, fontSize: 13, marginTop: 2 }}>{value}</Text>
  </View>
);

const ActionButton = ({
  label,
  onPress,
  loading,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
}) => {
  const colors = {
    primary: { bg: "#2563eb", text: "#fff" },
    success: { bg: "#16a34a", text: "#fff" },
    warning: { bg: "#f59e0b", text: "#0f172a" },
    danger: { bg: "#ef4444", text: "#fff" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.bg,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <Text style={{ color: colors.text, fontFamily: "Jakarta-Bold, system-ui, sans-serif", fontSize: 13 }}>
        {loading ? "..." : label}
      </Text>
    </Pressable>
  );
};
