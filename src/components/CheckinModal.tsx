// Morning readiness check-in modal. Ports the web app's daily check-in
// (js/progress.js openCheckin): sleep, energy, HRV, water, protein,
// supplements, plus a 7-day history with edit/clear. The task brief adds
// sleep quality, soreness, fatigue, and motivation sliders.
import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/storage/settings';
import { fmtDateKey, loadMeasures } from '@/src/lib/progress';
import {
  addWater,
  getCheckin,
  getCheckinHistory,
  getProtein,
  getSupplements,
  getSuppLog,
  getWater,
  proteinTarget,
  saveCheckin,
  saveSupplements,
  saveSuppLog,
  setProtein,
  setWater,
  WATER_TARGET_ML,
  type CheckinData,
  type CheckinHistoryEntry,
  type Supplement,
} from '@/src/lib/recovery';
import { radius, spacing } from '@/src/theme';

function RatingRow({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.ratingDot,
              {
                backgroundColor: active ? colors.accent : colors.surface,
                borderColor: active ? colors.accent : colors.line,
              },
            ]}
            accessibilityLabel={`Rate ${n} out of 5`}
          >
            <Text
              style={[type.body, { color: active ? colors.bg : colors.muted }]}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const btn = (icon: 'remove' | 'add', delta: number, label: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      style={[styles.stepBtn, { borderColor: colors.line }]}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', -step, 'Decrease')}
      <Text style={[type.subtitle, { minWidth: 90, textAlign: 'center' }]}>
        {format(value)}
      </Text>
      {btn('add', step, 'Increase')}
    </View>
  );
}

function Label({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[theme.type.caption, { color: theme.colors.muted }]}>
      {children}
    </Text>
  );
}

export function CheckinModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const todayKey = fmtDateKey(new Date());

  const [checkin, setCheckin] = useState<CheckinData>({});
  const [water, setWaterMl] = useState(0);
  const [protein, setProteinG] = useState(0);
  const [proteinGoal, setProteinGoal] = useState(180);
  const [supps, setSupps] = useState<Supplement[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [newSupp, setNewSupp] = useState('');
  const [history, setHistory] = useState<CheckinHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [ci, w, p, s, t, h] = await Promise.all([
      getCheckin(todayKey),
      getWater(todayKey),
      getProtein(todayKey),
      getSupplements(),
      getSuppLog(todayKey),
      getCheckinHistory(7),
    ]);
    setCheckin(ci ?? {});
    setWaterMl(w);
    setProteinG(p);
    setSupps(s);
    setTaken(t);
    setHistory(h);
    const measures = await loadMeasures();
    const last = measures.length ? measures[measures.length - 1] : null;
    const bwKg =
      last && last.weight
        ? settings.units === 'lb'
          ? last.weight * 0.453592
          : last.weight
        : null;
    setProteinGoal(proteinTarget(bwKg, settings.goal, settings.units));
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const set = (patch: Partial<CheckinData>) =>
    setCheckin((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveCheckin(todayKey, checkin);
      await setWater(todayKey, water);
      await setProtein(todayKey, protein);
      await saveSuppLog(todayKey, taken);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleSupp = (id: string) =>
    setTaken((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const addSupp = async () => {
    const name = newSupp.trim();
    if (!name) return;
    const next = [...supps, { id: `supp-${Date.now().toString(36)}`, name }];
    setSupps(next);
    await saveSupplements(next);
    setNewSupp('');
  };

  const removeSupp = async (id: string) => {
    const next = supps.filter((s) => s.id !== id);
    setSupps(next);
    await saveSupplements(next);
    setTaken((prev) => prev.filter((s) => s !== id));
  };

  const clearDay = async (date: string) => {
    await setWater(date, 0);
    await setProtein(date, 0);
    setHistory(await getCheckinHistory(7));
    if (date === todayKey) {
      setWaterMl(0);
      setProteinG(0);
    }
  };

  const waterPct = Math.round(Math.min(100, (water / WATER_TARGET_ML) * 100));
  const proteinPct = Math.round(
    Math.min(100, (protein / Math.max(1, proteinGoal)) * 100)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <View>
            <Text style={type.subtitle}>Daily check-in</Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[type.body, { color: colors.accent }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <Label>Sleep (hours)</Label>
          <Stepper
            value={checkin.sleep ?? 7}
            step={0.5}
            min={0}
            max={14}
            format={(v) => `${v.toFixed(1)}h`}
            onChange={(v) => set({ sleep: v })}
          />

          <Label>Sleep quality</Label>
          <RatingRow
            value={checkin.sleepQuality}
            onChange={(v) => set({ sleepQuality: v })}
          />

          <Label>Energy</Label>
          <RatingRow
            value={checkin.energy}
            onChange={(v) => set({ energy: v })}
          />

          <Label>Soreness</Label>
          <RatingRow
            value={checkin.soreness}
            onChange={(v) => set({ soreness: v })}
          />

          <Label>Fatigue</Label>
          <RatingRow
            value={checkin.fatigue}
            onChange={(v) => set({ fatigue: v })}
          />

          <Label>Motivation</Label>
          <RatingRow
            value={checkin.motivation}
            onChange={(v) => set({ motivation: v })}
          />

          <Label>HRV (ms, optional)</Label>
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
            keyboardType="numeric"
            placeholder="e.g. 62"
            placeholderTextColor={colors.muted}
            value={
              checkin.hrv != null && checkin.hrv !== undefined
                ? String(checkin.hrv)
                : ''
            }
            onChangeText={(t) => {
              const v = parseFloat(t);
              set({ hrv: t.trim() === '' || !Number.isFinite(v) ? null : v });
            }}
          />

          <Label>
            Water ({waterPct}% of {WATER_TARGET_ML}ml)
          </Label>
          <View style={styles.waterRow}>
            <Pressable
              style={[styles.waterBtn, { borderColor: colors.line }]}
              onPress={async () => setWaterMl(await addWater(todayKey, -250))}
            >
              <Text style={[type.body, { color: colors.accent }]}>-250</Text>
            </Pressable>
            <Text style={[type.subtitle, styles.waterVal]}>{water} ml</Text>
            <Pressable
              style={[styles.waterBtn, { borderColor: colors.line }]}
              onPress={async () => setWaterMl(await addWater(todayKey, 250))}
            >
              <Text style={[type.body, { color: colors.accent }]}>+250</Text>
            </Pressable>
            <Pressable
              style={[styles.waterBtn, { borderColor: colors.line }]}
              onPress={async () => setWaterMl(await addWater(todayKey, 500))}
            >
              <Text style={[type.body, { color: colors.accent }]}>+500</Text>
            </Pressable>
          </View>

          <Label>
            Protein ({protein}g / {proteinGoal}g - {proteinPct}%)
          </Label>
          <Stepper
            value={protein}
            step={10}
            min={0}
            max={500}
            format={(v) => `${v}g`}
            onChange={(v) => setProteinG(v)}
          />

          <Label>Supplements</Label>
          {supps.length === 0 && (
            <Text style={[type.body, { color: colors.muted }]}>
              No supplements yet. Add your daily stack below.
            </Text>
          )}
          {supps.map((s) => (
            <View key={s.id} style={styles.suppRow}>
              <Pressable
                onPress={() => toggleSupp(s.id)}
                style={[
                  styles.suppCheck,
                  {
                    borderColor: taken.includes(s.id)
                      ? colors.accent
                      : colors.line,
                    backgroundColor: taken.includes(s.id)
                      ? colors.accent
                      : 'transparent',
                  },
                ]}
                accessibilityLabel={`Mark ${s.name} taken`}
              >
                {taken.includes(s.id) && (
                  <Ionicons name="checkmark" size={18} color={colors.bg} />
                )}
              </Pressable>
              <Text style={[type.body, styles.suppName]}>{s.name}</Text>
              <Pressable onPress={() => removeSupp(s.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          <View style={styles.suppAdd}>
            <TextInput
              style={[
                type.body,
                styles.input,
                styles.suppInput,
                {
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                },
              ]}
              placeholder="Add supplement"
              placeholderTextColor={colors.muted}
              value={newSupp}
              onChangeText={setNewSupp}
              onSubmitEditing={addSupp}
            />
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              onPress={addSupp}
            >
              <Ionicons name="add" size={20} color={colors.bg} />
            </Pressable>
          </View>

          <Label>Last 7 days</Label>
          {history.map((h) => {
            const d = new Date(h.date + 'T12:00:00');
            const label = d.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const parts: string[] = [];
            if (h.checkin?.sleep != null)
              parts.push(`${h.checkin.sleep}h sleep`);
            if (h.checkin?.energy != null)
              parts.push(`energy ${h.checkin.energy}/5`);
            if (h.checkin?.hrv != null) parts.push(`${h.checkin.hrv}ms HRV`);
            if (h.water) parts.push(`${h.water}ml water`);
            if (h.protein) parts.push(`${h.protein}g protein`);
            return (
              <View
                key={h.date}
                style={[styles.histRow, { borderBottomColor: colors.line }]}
              >
                <View style={styles.histText}>
                  <Text style={[type.body, { fontWeight: '700' }]}>
                    {label}
                  </Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {parts.join(' · ') || 'No data'}
                  </Text>
                </View>
                {(h.water > 0 || h.protein > 0) && (
                  <Pressable onPress={() => clearDay(h.date)} hitSlop={8}>
                    <Text style={[type.caption, { color: colors.accent }]}>
                      Clear
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: colors.line, backgroundColor: colors.bg },
          ]}
        >
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              {saving ? 'Saving...' : 'Save check-in'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.sm },
  ratingRow: { flexDirection: 'row', gap: spacing.sm },
  ratingDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waterBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  waterVal: { flex: 1, textAlign: 'center' },
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  suppCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppName: { flex: 1 },
  suppAdd: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  suppInput: { flex: 1 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  histText: { flex: 1, gap: 2 },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  saveButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
