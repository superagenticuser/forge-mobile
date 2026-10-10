// Plate calculator modal, ported from the web app (js/views.js calcPlates /
// plateDiagramSVG). Shows plates per side plus a simple barbell diagram.
import { useMemo, useState } from 'react';
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

import { calcPlates, PLATE_COLORS } from '@/src/lib/training';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

function PlateDiagram({ plates }: { plates: number[] }) {
  const theme = useTheme();
  const { colors } = theme;
  const maxW = Math.max(25, ...plates);
  return (
    <View style={styles.diagram}>
      {/* bar shaft */}
      <View style={[styles.shaft, { backgroundColor: '#8a8f98' }]} />
      <View style={styles.platesRow}>
        {[...plates]
          .sort((a, b) => b - a)
          .map((w, i) => {
            const frac = w / maxW;
            const height = 26 + Math.round(54 * frac);
            const width = 10 + Math.round(14 * frac);
            const color = PLATE_COLORS[w] ?? '#8a8f98';
            const dark = color === '#e8e8e8';
            return (
              <View
                key={`${w}-${i}`}
                style={[
                  styles.plate,
                  {
                    height,
                    width,
                    backgroundColor: color,
                    borderColor: dark ? '#9aa0a8' : 'rgba(0,0,0,0.35)',
                  },
                ]}
              >
                {height >= 52 && (
                  <Text
                    style={[
                      styles.plateLabel,
                      { color: dark ? '#1a1d21' : '#fff' },
                    ]}
                  >
                    {w}
                  </Text>
                )}
              </View>
            );
          })}
        {/* collar */}
        {plates.length > 0 && (
          <View style={[styles.collar, { backgroundColor: colors.muted }]} />
        )}
      </View>
      <Text style={[styles.diagramCaption, { color: colors.muted }]}>
        One side of the bar, heaviest plate nearest the center
      </Text>
    </View>
  );
}

export function PlateCalculatorModal({
  visible,
  onClose,
  initialTarget,
}: {
  visible: boolean;
  onClose: () => void;
  /** Prefill target in the user's display units (e.g. working set weight). */
  initialTarget?: number;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units;

  const defaultBar = units === 'kg' ? 20 : 45;
  const [bar, setBar] = useState(String(defaultBar));
  const [target, setTarget] = useState(
    initialTarget != null && initialTarget > 0
      ? String(Math.round(initialTarget * 10) / 10)
      : ''
  );

  const result = useMemo(() => {
    const barV = parseFloat(bar) || 0;
    const targetV = parseFloat(target) || 0;
    if (!targetV) return null;
    return calcPlates(targetV, barV, units);
  }, [bar, target, units]);

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
          <Text style={type.subtitle}>Plate calculator</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[type.body, { color: colors.accent }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={[type.caption, { color: colors.muted }]}>
                Bar ({units})
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
                value={bar}
                onChangeText={setBar}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={styles.field}>
              <Text style={[type.caption, { color: colors.muted }]}>
                Target ({units})
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
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                returnKeyType="done"
                placeholder="e.g. 100"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {result && !result.impossible && (
            <View style={styles.result}>
              {result.perSide.length > 0 ? (
                <>
                  <PlateDiagram plates={result.perSide} />
                  <Text style={[type.subtitle, { textAlign: 'center' }]}>
                    Per side: {result.perSide.join(' + ')}{' '}
                    <Text style={{ color: colors.muted }}>{units}</Text>
                  </Text>
                </>
              ) : (
                <Text style={[type.body, { color: colors.muted }]}>
                  Just the bar.
                </Text>
              )}
              {result.shortBy > 0 && (
                <Text
                  style={[
                    type.caption,
                    { color: colors.warn, textAlign: 'center' },
                  ]}
                >
                  Closest match: {result.perSide.join(' + ') || 'bar only'} per
                  side ({Math.round(result.shortBy * 10) / 10} {units} short).
                </Text>
              )}
            </View>
          )}
          {result?.impossible && (
            <Text style={[type.body, { color: colors.warn }]}>
              Target must be heavier than the bar.
            </Text>
          )}
        </ScrollView>
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
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  result: { gap: spacing.md },
  diagram: { alignItems: 'center', gap: spacing.sm },
  shaft: {
    width: '90%',
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: '5%',
    top: 40,
  },
  platesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 90,
    paddingTop: 4,
  },
  plate: {
    borderWidth: 1,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateLabel: { fontSize: 10, fontWeight: '700' },
  collar: { width: 8, height: 22, borderRadius: 2 },
  diagramCaption: { fontSize: 12 },
});
