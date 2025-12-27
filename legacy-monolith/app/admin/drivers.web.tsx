// @ts-nocheck
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomButton from "@/components/CustomButton";
import { fetchAPI, useFetch } from "@/lib/fetch";
import { Driver } from "@/types/type";

type DriverForm = {
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: string;
  rating: string;
};

const emptyForm: DriverForm = {
  first_name: "",
  last_name: "",
  profile_image_url: "",
  car_image_url: "",
  car_seats: "4",
  rating: "5.0",
};

const Field = ({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
}) => (
  <View className="flex-1">
    <Text className="text-xs text-general-200 font-JakartaSemiBold mb-2">
      {label}
    </Text>
    <TextInput
      value={value}
      placeholder={placeholder}
      onChangeText={onChangeText}
      className="bg-white border border-general-700 rounded-xl px-4 py-3 text-sm"
    />
  </View>
);

const normalize = (value: string) => value.trim();

export default function AdminDrivers() {
  const { data, loading, error, refetch } = useFetch<Driver[]>("/(api)/driver");

  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyForm);

  const drivers = data ?? [];
  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q),
    );
  }, [drivers, query]);

  const resetForm = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (driver: Driver) => {
    setMode("edit");
    setEditingId(driver.id);
    setForm({
      first_name: driver.first_name ?? "",
      last_name: driver.last_name ?? "",
      profile_image_url: driver.profile_image_url ?? "",
      car_image_url: driver.car_image_url ?? "",
      car_seats: String(driver.car_seats ?? 4),
      rating: String(driver.rating ?? 5.0),
    });
  };

  const submit = async () => {
    const first = normalize(form.first_name);
    const last = normalize(form.last_name);

    if (!first || !last) {
      Alert.alert("Validación", "Nombre y apellido son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: first,
        last_name: last,
        profile_image_url: normalize(form.profile_image_url) || null,
        car_image_url: normalize(form.car_image_url) || null,
        car_seats: form.car_seats ? Number(form.car_seats) : undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      };

      if (mode === "create") {
        await fetchAPI("/(api)/driver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (!editingId) throw new Error("Missing driver id");
        await fetchAPI(`/(api)/driver/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      await refetch();
      resetForm();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar el driver.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (driver: Driver) => {
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Eliminar a ${driver.first_name} ${driver.last_name}? Esta acción no se puede deshacer.`,
          )
        : true;
    if (!ok) return;

    setSaving(true);
    try {
      await fetchAPI(`/(api)/driver/${driver.id}`, { method: "DELETE" });
      await refetch();
      if (editingId === driver.id) resetForm();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo eliminar el driver.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-JakartaExtraBold text-black">
          Drivers
        </Text>
        <View className="w-[320px]">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar driver..."
            className="bg-white border border-general-700 rounded-xl px-4 py-3 text-sm"
          />
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-general-700 p-5 shadow-sm shadow-neutral-300">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-JakartaBold text-black">
            {mode === "create" ? "Crear driver" : "Editar driver"}
          </Text>
          {mode === "edit" ? (
            <Pressable onPress={resetForm}>
              <Text className="text-sm font-JakartaSemiBold text-primary-500">
                Cancelar
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-x-4">
          <Field
            label="Nombre"
            value={form.first_name}
            placeholder="James"
            onChangeText={(v) => setForm((s) => ({ ...s, first_name: v }))}
          />
          <Field
            label="Apellido"
            value={form.last_name}
            placeholder="Wilson"
            onChangeText={(v) => setForm((s) => ({ ...s, last_name: v }))}
          />
          <Field
            label="Asientos"
            value={form.car_seats}
            placeholder="4"
            onChangeText={(v) => setForm((s) => ({ ...s, car_seats: v }))}
          />
          <Field
            label="Rating (0-5)"
            value={form.rating}
            placeholder="4.8"
            onChangeText={(v) => setForm((s) => ({ ...s, rating: v }))}
          />
        </View>

        <View className="flex-row gap-x-4 mt-4">
          <Field
            label="Foto perfil (URL)"
            value={form.profile_image_url}
            placeholder="https://..."
            onChangeText={(v) =>
              setForm((s) => ({ ...s, profile_image_url: v }))
            }
          />
          <Field
            label="Foto auto (URL)"
            value={form.car_image_url}
            placeholder="https://..."
            onChangeText={(v) => setForm((s) => ({ ...s, car_image_url: v }))}
          />
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-xs text-general-200 font-JakartaRegular">
            Tip: podés editar el pricing en “Tarifas”.
          </Text>
          <View className="w-[220px]">
            <CustomButton
              title={saving ? "Guardando..." : "Guardar"}
              onPress={submit}
              className="w-full"
            />
          </View>
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-lg font-JakartaBold text-black mb-3">
          Lista ({filteredDrivers.length})
        </Text>

        {loading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View className="bg-white border border-general-700 rounded-2xl p-5">
            <Text className="text-sm text-red-500">{error}</Text>
          </View>
        ) : filteredDrivers.length === 0 ? (
          <View className="bg-white border border-general-700 rounded-2xl p-5">
            <Text className="text-sm text-general-200">
              No hay drivers para mostrar.
            </Text>
          </View>
        ) : (
          <View className="gap-y-3">
            {filteredDrivers.map((driver) => (
              <View
                key={driver.id}
                className="bg-white border border-general-700 rounded-2xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-general-600 items-center justify-center overflow-hidden">
                    {driver.profile_image_url ? (
                      <Image
                        source={{ uri: driver.profile_image_url }}
                        className="w-12 h-12"
                      />
                    ) : (
                      <Text className="text-sm font-JakartaBold text-general-200">
                        {driver.first_name?.[0] ?? "?"}
                        {driver.last_name?.[0] ?? ""}
                      </Text>
                    )}
                  </View>

                  <View className="ml-4">
                    <Text className="text-base font-JakartaBold text-black">
                      {driver.first_name} {driver.last_name}
                    </Text>
                    <Text className="text-xs font-JakartaRegular text-general-200 mt-1">
                      Asientos: {driver.car_seats} · Rating: {driver.rating}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-x-3">
                  <Pressable
                    className="px-3 py-2 rounded-lg bg-general-600"
                    onPress={() => startEdit(driver)}
                  >
                    <Text className="text-sm font-JakartaSemiBold text-black">
                      Editar
                    </Text>
                  </Pressable>
                  <Pressable
                    className="px-3 py-2 rounded-lg bg-danger-100"
                    onPress={() => remove(driver)}
                  >
                    <Text className="text-sm font-JakartaSemiBold text-danger-700">
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
