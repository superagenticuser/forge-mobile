// Progress > Body: measurement logging with weight trend chart.
// Ports the web app's body tab (js/progress.js renderBodyTab); progress
// photos are deferred to v0.13 (camera).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/storage/settings';
import {
  addMeasure,
  fmtDateKey,
  loadMeasures,
  type Measure,
} from '@/src/lib/progress';
import { LineChart } from '@/src/components/progress/LineChart';
import { Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function BodyTab() {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const girthUnit = units === 'kg' ? 'cm' : 'in';

  const [measures, setMeasures] = useState<Measure[]>([]);
  const [ready, setReady] = useState(false);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await loadMeasures();
      if (!cancelled) {
        setMeasures(all);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const num = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const w = num(weight);
    const wa = num(waist);
    const c = num(chest);
    const a = num(arms);
    if (!w && !wa && !c && !a) return;
    setSaving(true);
    try {
      const entry: Measure = { date: fmtDateKey(new Date()), ts: Date.now() };
      if (w) entry.weight = w;
      if (wa) entry.waist = wa;
      if (c) entry.chest = c;
      if (a) entry.arms = a;
      const all = await addMeasure(entry);
      setMeasures(all);
      setWeight('');
      setWaist('');
      setChest('');
      setArms('');
    } finally {
      setSaving(false);
    }
  };

  const weightPoints = useMemo(
    () =>
      measures
        .filter((m) => m.weight != null)
        .map((m) => ({ date: m.date, value: m.weight as number })),
    [measures]
  );

  const latest = measures.length ? measures[measures.length - 1] : null;

  const field = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    unit: string
  ) => (
    <View style={styles.field}>
      <Text style={[type.caption, { color: colors.muted }]}>
        {label} ({unit})
      </Text>
      <TextInput
        style={[
          type.body,
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor: colors.line,
          },
        ]}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="-"
        placeholderTextColor={colors.muted}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <SectionTitle>Body measurements</SectionTitle>
      <View style={styles.grid}>
        {field('Weight', weight, setWeight, units)}
        {field('Waist', waist, setWaist, girthUnit)}
        {field('Chest', chest, setChest, girthUnit)}
        {field('Arms', arms, setArms, girthUnit)}
      </View>
      <Pressable
        onPress={save}
        disabled={saving}
        style={[styles.save, { backgroundColor: colors.accent }]}
      >
        <Text style={[type.chip, { color: colors.accentInk }]}>
          {saving ? 'Saving...' : 'Log measurements'}
        </Text>
      </Pressable>

      {latest && (
        <View
          style={[
            styles.latest,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Muted>Latest ({latest.date})</Muted>
          <Text style={[type.body, { color: colors.ink }]}>
            {[
              latest.weight != null ? `${latest.weight} ${units}` : null,
              latest.waist != null
                ? `waist ${latest.waist} ${girthUnit}`
                : null,
              latest.chest != null
                ? `chest ${latest.chest} ${girthUnit}`
                : null,
              latest.arms != null ? `arms ${latest.arms} ${girthUnit}` : null,
            ]
              .filter(Boolean)
              .join('  -  ')}
          </Text>
        </View>
      )}

      <SectionTitle>Weight trend</SectionTitle>
      {ready && weightPoints.length >= 2 ? (
        <LineChart
          points={weightPoints.map((p) => ({
            label: p.date,
            value: p.value,
          }))}
          formatValue={(v) => `${Math.round(v * 10) / 10} ${units}`}
          accessibilityLabel="Body weight trend chart"
        />
      ) : (
        <Muted>Log your weight twice to see a trend.</Muted>
      )}

      <SectionTitle>Progress photos</SectionTitle>
      <View
        style={[
          styles.photos,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Ionicons name="camera-outline" size={24} color={colors.muted} />
        <Text style={[type.body, { color: colors.muted }]}>
          Progress photos arrive with the camera phase. Your measurements above
          are saved and ready.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { flex: 1, minWidth: 130, gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  save: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  latest: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  photos: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
});
