import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchAPI } from "@/lib/fetch";

export type WaitlistFormVariant = "light" | "dark";

type DriverWaitlistFormProps = {
  variant?: WaitlistFormVariant;
  source?: string;
  compact?: boolean;
};

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  vehicle: "",
  experience_years: "",
  notes: "",
};

const DriverWaitlistForm: React.FC<DriverWaitlistFormProps> = ({
  variant = "light",
  source = "web",
  compact = false,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const theme = useMemo(() => {
    const isDark = variant === "dark";
    return {
      isDark,
      card: isDark ? "rgba(15,18,26,0.9)" : "#ffffff",
      border: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
      text: isDark ? "#e2e8f0" : "#0f172a",
      muted: isDark ? "#94a3b8" : "#64748b",
      input: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
      button: isDark ? "#22c55e" : "#0f172a",
      buttonText: isDark ? "#0f172a" : "#f8fafc",
      accent: isDark ? "#d9b14a" : "#0ea5e9",
    };
  }, [variant]);

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setMessage(null);
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const email = form.email.trim();

    if (!first || !last || !email) {
      Alert.alert("Datos incompletos", "Nombre, apellido y email son obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      await fetchAPI("/api/driver/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          first_name: first,
          last_name: last,
          email,
          experience_years: form.experience_years
            ? Number(form.experience_years)
            : undefined,
          source,
        }),
      });
      setMessage("Listo, te avisaremos cuando abramos cupo.");
      setForm(emptyForm);
    } catch (err: any) {
      const errMsg = err?.message || "No se pudo guardar, intenta de nuevo.";
      setMessage(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.border, backgroundColor: theme.card },
        compact && { padding: 14 },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Únete a la waitlist de drivers</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Déjanos tus datos y te avisamos apenas activemos tu cuenta.
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: `${theme.accent}22`,
            borderWidth: 1,
            borderColor: `${theme.accent}55`,
          }}
        >
          <Text style={{ color: theme.accent, fontWeight: "700", fontSize: 12 }}>Prioridad</Text>
        </View>
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Nombre"
          placeholderTextColor={theme.muted}
          value={form.first_name}
          onChangeText={(v) => setField("first_name", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          placeholder="Apellido"
          placeholderTextColor={theme.muted}
          value={form.last_name}
          onChangeText={(v) => setField("last_name", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.muted}
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(v) => setField("email", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          placeholder="Teléfono"
          placeholderTextColor={theme.muted}
          value={form.phone}
          onChangeText={(v) => setField("phone", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Ciudad"
          placeholderTextColor={theme.muted}
          value={form.city}
          onChangeText={(v) => setField("city", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          placeholder="Auto / modelo"
          placeholderTextColor={theme.muted}
          value={form.vehicle}
          onChangeText={(v) => setField("vehicle", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Años de experiencia"
          placeholderTextColor={theme.muted}
          value={form.experience_years}
          onChangeText={(v) => setField("experience_years", v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          placeholder="Notas (opcional)"
          placeholderTextColor={theme.muted}
          value={form.notes}
          onChangeText={(v) => setField("notes", v)}
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
        />
      </View>

      {message ? (
        <Text style={{ color: theme.accent, fontSize: 13, marginTop: 4 }}>{message}</Text>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={submitting}
        style={[styles.button, { backgroundColor: theme.button, opacity: submitting ? 0.7 : 1 }]}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {submitting ? "Enviando..." : "Unirme a la lista"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  button: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});

export default DriverWaitlistForm;
