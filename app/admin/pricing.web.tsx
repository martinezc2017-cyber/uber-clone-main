import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomButton from "@/components/CustomButton";
import { fetchAPI, useFetch } from "@/lib/fetch";
import {
  computeFare,
  DEFAULT_RATE_CARD,
  MIN_FARE_FLOOR,
  RateCard,
} from "@/lib/pricing";

type PricingConfig = {
  rateCard: RateCard;
  surgeMultiplierOverride: number | null;
  updatedAt: string | null;
};

type PricingForm = {
  baseFare: string;
  serviceFee: string;
  costPerMile: string;
  costPerMinute: string;
  minFare: string;
  commissionRate: string;
  surgeMultiplierOverride: string;
};

const toString = (n: number, decimals = 2) => n.toFixed(decimals);

const NumberField = ({
  label,
  value,
  placeholder,
  onChangeText,
  help,
}: {
  label: string;
  value: string;
  placeholder?: string;
  help?: string;
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
      keyboardType="numeric"
      className="bg-white border border-general-700 rounded-xl px-4 py-3 text-sm"
    />
    {help ? (
      <Text className="text-[11px] text-general-200 font-JakartaRegular mt-2">
        {help}
      </Text>
    ) : null}
  </View>
);

const parseMaybeNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

const toForm = (config: PricingConfig): PricingForm => ({
  baseFare: toString(config.rateCard.baseFare, 2),
  serviceFee: toString(config.rateCard.serviceFee, 2),
  costPerMile: toString(config.rateCard.costPerMile, 3),
  costPerMinute: toString(config.rateCard.costPerMinute, 3),
  minFare: toString(Math.max(config.rateCard.minFare, MIN_FARE_FLOOR), 2),
  commissionRate: String(config.rateCard.commissionRate),
  surgeMultiplierOverride:
    config.surgeMultiplierOverride != null
      ? String(config.surgeMultiplierOverride)
      : "",
});

export default function AdminPricing() {
  const { data, loading, error, refetch } =
    useFetch<PricingConfig>("/(api)/pricing");

  const [form, setForm] = useState<PricingForm>(() =>
    toForm({
      rateCard: DEFAULT_RATE_CARD,
      surgeMultiplierOverride: null,
      updatedAt: null,
    }),
  );
  const [saving, setSaving] = useState(false);

  const [previewDistance, setPreviewDistance] = useState("6.2");
  const [previewDuration, setPreviewDuration] = useState("18");
  const [previewDrivers, setPreviewDrivers] = useState("6");

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const nextRateCard: RateCard = useMemo(() => {
    const baseFare = parseMaybeNumber(form.baseFare) ?? DEFAULT_RATE_CARD.baseFare;
    const serviceFee =
      parseMaybeNumber(form.serviceFee) ?? DEFAULT_RATE_CARD.serviceFee;
    const costPerMile =
      parseMaybeNumber(form.costPerMile) ?? DEFAULT_RATE_CARD.costPerMile;
    const costPerMinute =
      parseMaybeNumber(form.costPerMinute) ?? DEFAULT_RATE_CARD.costPerMinute;
    const minFare = Math.max(
      parseMaybeNumber(form.minFare) ?? DEFAULT_RATE_CARD.minFare,
      MIN_FARE_FLOOR,
    );
    const commissionRate =
      parseMaybeNumber(form.commissionRate) ?? DEFAULT_RATE_CARD.commissionRate;

    return {
      baseFare,
      serviceFee,
      costPerMile,
      costPerMinute,
      minFare,
      commissionRate,
    };
  }, [form]);

  const surgeOverride = useMemo(
    () => parseMaybeNumber(form.surgeMultiplierOverride),
    [form.surgeMultiplierOverride],
  );

  const previewFare = useMemo(() => {
    const distanceMiles = parseMaybeNumber(previewDistance) ?? 6.2;
    const durationMinutes = parseMaybeNumber(previewDuration) ?? 18;
    const availableDrivers = parseMaybeNumber(previewDrivers) ?? 6;

    return computeFare({
      distanceMiles,
      durationMinutes,
      rateCard: nextRateCard,
      context: {
        availableDrivers,
        surgeMultiplierOverride: surgeOverride ?? undefined,
      },
    });
  }, [
    nextRateCard,
    previewDistance,
    previewDuration,
    previewDrivers,
    surgeOverride,
  ]);

  const save = async () => {
    setSaving(true);
    try {
      await fetchAPI("/(api)/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextRateCard,
          surgeMultiplierOverride: surgeOverride,
        }),
      });

      await refetch();
      Alert.alert("OK", "Tarifas actualizadas.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setForm(
      toForm({
        rateCard: DEFAULT_RATE_CARD,
        surgeMultiplierOverride: null,
        updatedAt: null,
      }),
    );
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-JakartaExtraBold text-black">
          Tarifas
        </Text>
        <Pressable onPress={resetToDefaults}>
          <Text className="text-sm font-JakartaSemiBold text-primary-500">
            Reset defaults
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center justify-center py-10">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="bg-white border border-general-700 rounded-2xl p-5">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      ) : (
        <>
          <View className="bg-white rounded-2xl border border-general-700 p-5 shadow-sm shadow-neutral-300">
            <Text className="text-lg font-JakartaBold text-black">
              Rate card
            </Text>
            <Text className="text-xs text-general-200 font-JakartaRegular mt-1">
              Última actualización: {data?.updatedAt ?? "—"}
            </Text>

            <View className="flex-row gap-x-4 mt-4">
              <NumberField
                label="Base fare ($)"
                value={form.baseFare}
                onChangeText={(v) => setForm((s) => ({ ...s, baseFare: v }))}
              />
              <NumberField
                label="Service fee ($)"
                value={form.serviceFee}
                onChangeText={(v) => setForm((s) => ({ ...s, serviceFee: v }))}
              />
              <NumberField
                label="Min fare ($)"
                value={form.minFare}
                help="Mínimo absoluto: $9.00"
                onChangeText={(v) => setForm((s) => ({ ...s, minFare: v }))}
              />
            </View>

            <View className="flex-row gap-x-4 mt-4">
              <NumberField
                label="Cost per mile ($/mi)"
                value={form.costPerMile}
                onChangeText={(v) => setForm((s) => ({ ...s, costPerMile: v }))}
              />
              <NumberField
                label="Cost per minute ($/min)"
                value={form.costPerMinute}
                onChangeText={(v) =>
                  setForm((s) => ({ ...s, costPerMinute: v }))
                }
              />
              <NumberField
                label="Commission rate (0..1)"
                value={form.commissionRate}
                help="Ej: 0.35 = 35%"
                onChangeText={(v) =>
                  setForm((s) => ({ ...s, commissionRate: v }))
                }
              />
            </View>

            <View className="flex-row gap-x-4 mt-4">
              <NumberField
                label="Surge override (opcional)"
                value={form.surgeMultiplierOverride}
                help="Vacío = usar cálculo automático; Ej: 1.25"
                onChangeText={(v) =>
                  setForm((s) => ({ ...s, surgeMultiplierOverride: v }))
                }
              />
              <View className="flex-1" />
              <View className="flex-1 items-end justify-end">
                <View className="w-[220px]">
                  <CustomButton
                    title={saving ? "Guardando..." : "Guardar"}
                    onPress={save}
                    className="w-full"
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="mt-6 bg-white rounded-2xl border border-general-700 p-5 shadow-sm shadow-neutral-300">
            <Text className="text-lg font-JakartaBold text-black">
              Preview
            </Text>
            <Text className="text-xs text-general-200 font-JakartaRegular mt-1">
              Simulación rápida con distancia/tiempo de ejemplo
            </Text>

            <View className="flex-row gap-x-4 mt-4">
              <NumberField
                label="Distancia (millas)"
                value={previewDistance}
                onChangeText={setPreviewDistance}
              />
              <NumberField
                label="Duración (min)"
                value={previewDuration}
                onChangeText={setPreviewDuration}
              />
              <NumberField
                label="Drivers disponibles"
                value={previewDrivers}
                onChangeText={setPreviewDrivers}
              />
            </View>

            <View className="mt-5 flex-row gap-x-4">
              <View className="flex-1 bg-general-600 rounded-2xl p-4">
                <Text className="text-xs text-general-200 font-JakartaSemiBold">
                  Total estimado
                </Text>
                <Text className="text-3xl text-black font-JakartaExtraBold mt-2">
                  ${previewFare.total.toFixed(2)}
                </Text>
                <Text className="text-xs text-general-200 font-JakartaRegular mt-2">
                  Surge: x{previewFare.surgeMultiplier} ({previewFare.surgeLabel})
                </Text>
              </View>
              <View className="flex-1 bg-general-600 rounded-2xl p-4">
                <Text className="text-xs text-general-200 font-JakartaSemiBold">
                  Driver earnings
                </Text>
                <Text className="text-3xl text-black font-JakartaExtraBold mt-2">
                  ${previewFare.driverEarnings.toFixed(2)}
                </Text>
                <Text className="text-xs text-general-200 font-JakartaRegular mt-2">
                  Comisión plataforma: ${previewFare.platformCommission.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
