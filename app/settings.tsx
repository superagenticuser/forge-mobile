// Settings screen. Ports the web app's settings modal (index.html +
// js/core.js syncSettingsUI) to native controls, grouped in the same
// sections. Every change persists to sqlite via the settings provider and
// takes effect app-wide instantly.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISES } from '@/src/data/exercises';
import { useTheme } from '@/src/storage/settings';
import { DataSection } from '@/src/components/settings/DataSection';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ACCENTS, radius, spacing } from '@/src/theme';
import * as Updates from 'expo-updates';

const EQUIPMENT_NAMES: Record<string, string> = {
  bodyweight: 'Bodyweight',
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  kettlebell: 'Kettlebell',
  band: 'Band',
};

function equipmentOptions(): string[] {
  return [...new Set(EXERCISES.map((e) => e.equipment))].sort();
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.muted }]}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.line,
          },
        ]}
      >
        {children}
      </View>
      {note ? (
        <Text style={[styles.note, { color: theme.colors.muted }]}>{note}</Text>
      ) : null}
    </View>
  );
}

function Row({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.line,
        },
      ]}
    >
      <Text style={[theme.type.body, { flex: 1 }]}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row label={label} last={last}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.line, true: theme.colors.volt }}
        thumbColor={value ? theme.colors.accentInk : theme.colors.muted}
      />
    </Row>
  );
}

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
  last,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={
        last
          ? undefined
          : { borderBottomWidth: 1, borderBottomColor: theme.colors.line }
      }
    >
      <Text style={[theme.type.body, styles.segmentLabel]}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.segment,
                {
                  borderColor: selected ? theme.colors.volt : theme.colors.line,
                  backgroundColor: selected ? theme.colors.volt : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: selected ? theme.colors.accentInk : theme.colors.ink,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepperRow({
  label,
  value,
  onChange,
  step,
  min,
  max,
  format,
  last,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  last?: boolean;
}) {
  const theme = useTheme();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const btn = {
    ...styles.stepperBtn,
    borderColor: theme.colors.line,
  };
  return (
    <Row label={label} last={last}>
      <View style={styles.stepper}>
        <Pressable
          onPress={dec}
          disabled={value <= min}
          style={[btn, value <= min && styles.stepperDisabled]}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color={theme.colors.ink} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: theme.colors.ink }]}>
          {format(value)}
        </Text>
        <Pressable
          onPress={inc}
          disabled={value >= max}
          style={[btn, value >= max && styles.stepperDisabled]}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color={theme.colors.ink} />
        </Pressable>
      </View>
    </Row>
  );
}

function ReminderRow() {
  const theme = useTheme();
  const { settings, updateSettings } = theme;
  const [text, setText] = useState(settings.reminder);
  useEffect(() => {
    setText(settings.reminder);
  }, [settings.reminder]);
  const commit = (v: string) => {
    const t = v.trim();
    if (t === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
      updateSettings({ reminder: t });
    }
  };
  return (
    <Row label="Reminder time" last>
      <View style={styles.reminderRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => commit(text)}
          onSubmitEditing={() => commit(text)}
          placeholder="HH:MM"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          style={[
            styles.timeInput,
            {
              color: theme.colors.ink,
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.bg,
            },
          ]}
        />
        {settings.reminder !== '' && (
          <Pressable onPress={() => updateSettings({ reminder: '' })}>
            <Text style={[styles.clearText, { color: theme.colors.volt }]}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>
    </Row>
  );
}

function AccentPicker() {
  const theme = useTheme();
  return (
    <View style={styles.accentGrid}>
      {ACCENTS.map((a) => {
        const selected = a.id === theme.accent;
        return (
          <Pressable
            key={a.id}
            onPress={() => theme.setAccent(a.id)}
            style={[
              styles.accentPick,
              {
                borderColor: selected ? theme.colors.volt : theme.colors.line,
                backgroundColor: selected ? `${a.color}1f` : 'transparent',
              },
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: a.color }]} />
            <Text
              style={[
                styles.accentName,
                {
                  color: selected ? theme.colors.ink : theme.colors.muted,
                },
              ]}
            >
              {a.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EquipmentChips() {
  const theme = useTheme();
  const { settings, updateSettings } = theme;
  const toggle = (eq: string) => {
    const cur = settings.myEquipment;
    const next = cur.includes(eq) ? cur.filter((x) => x !== eq) : [...cur, eq];
    updateSettings({ myEquipment: next });
  };
  return (
    <View style={styles.chipGrid}>
      {equipmentOptions().map((eq) => {
        const selected = settings.myEquipment.includes(eq);
        return (
          <Pressable
            key={eq}
            onPress={() => toggle(eq)}
            style={[
              styles.chip,
              {
                borderColor: selected ? theme.colors.volt : theme.colors.line,
                backgroundColor: selected ? theme.colors.volt : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                theme.type.chip,
                {
                  color: selected ? theme.colors.accentInk : theme.colors.muted,
                },
              ]}
            >
              {EQUIPMENT_NAMES[eq] ?? eq}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = theme;
  const [pendingFinish, setPendingFinish] = useState<'standard' | 'chrome' | 'xray' | 'matte' | null>(null);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Section
        title="Accent color"
        note="Applies across the app, including the 3D body ring."
      >
        <AccentPicker />
      </Section>

      <Section title="Training">
        <SegmentedRow
          label="Units"
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={settings.units}
          onChange={(v) => updateSettings({ units: v })}
        />
        <SegmentedRow
          label="Goal"
          options={[
            { value: 'cut', label: 'Cut' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'bulk', label: 'Bulk' },
          ]}
          value={settings.goal}
          onChange={(v) => updateSettings({ goal: v })}
          last
        />
      </Section>

      <Section title="Accessibility">
        <ToggleRow
          label="Big text mode"
          value={settings.bigText}
          onChange={(v) => updateSettings({ bigText: v })}
        />
        <ToggleRow
          label="High contrast"
          value={settings.highContrast}
          onChange={(v) => updateSettings({ highContrast: v })}
        />
        <ToggleRow
          label="Reduce motion"
          value={settings.reduceMotion}
          onChange={(v) => updateSettings({ reduceMotion: v })}
          last
        />
      </Section>

      <Section
        title="My equipment"
        note="Used by the program quiz and exercise swaps. Empty means everything."
      >
        <EquipmentChips />
      </Section>

      {/* Language selector hidden for now - no i18n infrastructure yet.
      <Section title="Language">
        <SegmentedRow
          label="Language"
          options={[
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
          ]}
          value={settings.lang}
          onChange={(v) => updateSettings({ lang: v })}
          last
        />
      </Section>
      */}

      <Section title="Workout">
        <ToggleRow
          label="Rest timer sound"
          value={settings.sound}
          onChange={(v) => updateSettings({ sound: v })}
        />
        <ToggleRow
          label="Auto-start rest timer"
          value={settings.autoRest}
          onChange={(v) => updateSettings({ autoRest: v })}
        />
        <ToggleRow
          label="Voice cues"
          value={settings.voiceCues}
          onChange={(v) => updateSettings({ voiceCues: v })}
        />
        <ToggleRow
          label="Voice control"
          value={settings.voiceControl}
          onChange={(v) => updateSettings({ voiceControl: v })}
        />
        <ToggleRow
          label="Haptic feedback"
          value={settings.haptics}
          onChange={(v) => updateSettings({ haptics: v })}
        />
        <ToggleRow
          label="Advanced training tools"
          value={settings.advanced}
          onChange={(v) => updateSettings({ advanced: v })}
        />
        <Text style={[styles.note, { color: theme.colors.muted }]}>
          Shows travel mode and tempo coach in workouts.
        </Text>
        <StepperRow
          label="Short rest"
          value={settings.restShort}
          onChange={(v) => updateSettings({ restShort: v })}
          step={15}
          min={15}
          max={300}
          format={(v) => `${v}s`}
        />
        <StepperRow
          label="Long rest"
          value={settings.restLong}
          onChange={(v) => updateSettings({ restLong: v })}
          step={15}
          min={30}
          max={600}
          format={(v) => `${v}s`}
          last
        />
      </Section>

      <Section title="3D body finish">
        <SegmentedRow
          label="Finish"
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'chrome', label: 'Chrome' },
            { value: 'xray', label: 'X-ray' },
            { value: 'matte', label: 'Matte' },
          ]}
          value={settings.bodyFinish}
          onChange={(v) => {
            // Body finish changes require an app restart to apply safely.
            // Live material switching corrupts the GL context on expo-gl.
            if (v !== settings.bodyFinish) {
              setPendingFinish(v as 'standard' | 'chrome' | 'xray' | 'matte');
            }
          }}
          last
        />
      </Section>
      <ConfirmDialog
        visible={pendingFinish !== null}
        title="Restart required"
        message="Changing the 3D body finish requires an app restart to apply safely. The app will restart now."
        confirmLabel="Restart now"
        destructive={false}
        onConfirm={async () => {
          if (pendingFinish) {
            await updateSettings({ bodyFinish: pendingFinish });
          }
          setPendingFinish(null);
          // Reload the app so the new finish is applied on a fresh GL context.
          await Updates.reloadAsync();
        }}
        onCancel={() => setPendingFinish(null)}
      />

      <Section
        title="Daily workout reminder"
        note="Shows a reminder banner on the home screen when it is time to train."
      >
        <ReminderRow />
      </Section>

      <Section title="Exercise demos">
        <ToggleRow
          label="Autoplay"
          value={settings.demoAutoplay}
          onChange={(v) => updateSettings({ demoAutoplay: v })}
        />
        <StepperRow
          label="Demo speed"
          value={settings.demoSpeed}
          onChange={(v) => updateSettings({ demoSpeed: v })}
          step={0.25}
          min={0.25}
          max={2}
          format={(v) => `${v}x`}
          last
        />
      </Section>

      <Section title="Data" note="Your data never leaves this device.">
        <DataSection />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  note: { fontSize: 12, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  segmentLabel: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    flexWrap: 'wrap',
  },
  segment: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.35 },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'center',
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    minWidth: 96,
    textAlign: 'center',
  },
  clearText: { fontSize: 14, fontWeight: '600' },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  accentPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  accentName: { fontSize: 14, fontWeight: '600' },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
