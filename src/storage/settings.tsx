// Settings state for FORGE, ported from the web app (js/core.js
// DEFAULT_SETTINGS plus the settings-modal-only keys: goal, bigText,
// highContrast). Stored in the sqlite `kv` table under the same
// `forge-settings` / `forge-accent` keys the web app uses, so a future
// web-backup import maps 1:1.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { buildTheme, getAccent, type Theme } from '@/src/theme';
import { kvGet, kvGetJSON, kvSet, kvSetJSON } from './db';

export type Units = 'kg' | 'lb';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type BodyFinish = 'standard' | 'chrome' | 'xray' | 'matte';
export type Lang = 'en' | 'fr';

export interface Settings {
  units: Units;
  sound: boolean;
  demoAutoplay: boolean;
  demoSpeed: number;
  reduceMotion: boolean;
  myEquipment: string[];
  lang: Lang;
  autoRest: boolean;
  restShort: number;
  restLong: number;
  voiceCues: boolean;
  reminder: string;
  advanced: boolean;
  haptics: boolean;
  bodyFinish: BodyFinish;
  goal: Goal;
  bigText: boolean;
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'kg',
  sound: true,
  demoAutoplay: true,
  demoSpeed: 1,
  reduceMotion: false,
  myEquipment: [],
  lang: 'en',
  autoRest: true,
  restShort: 60,
  restLong: 180,
  voiceCues: false,
  reminder: '',
  advanced: false,
  haptics: true,
  bodyFinish: 'standard',
  goal: 'maintain',
  bigText: false,
  highContrast: false,
};

export const DEFAULT_ACCENT = 'volt';

const SETTINGS_KEY = 'forge-settings';
const ACCENT_KEY = 'forge-accent';

const FINISHES: BodyFinish[] = ['standard', 'chrome', 'xray', 'matte'];
const GOALS: Goal[] = ['cut', 'maintain', 'bulk'];
const LANGS: Lang[] = ['en', 'fr'];

/** Merge a stored blob over defaults, guarding every field's type. */
function sanitizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    units: s.units === 'lb' ? 'lb' : 'kg',
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    demoAutoplay:
      typeof s.demoAutoplay === 'boolean'
        ? s.demoAutoplay
        : DEFAULT_SETTINGS.demoAutoplay,
    demoSpeed:
      typeof s.demoSpeed === 'number' && s.demoSpeed > 0
        ? s.demoSpeed
        : DEFAULT_SETTINGS.demoSpeed,
    reduceMotion:
      typeof s.reduceMotion === 'boolean'
        ? s.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    myEquipment: Array.isArray(s.myEquipment)
      ? s.myEquipment.filter((e): e is string => typeof e === 'string')
      : [],
    lang: LANGS.includes(s.lang as Lang) ? (s.lang as Lang) : 'en',
    autoRest:
      typeof s.autoRest === 'boolean' ? s.autoRest : DEFAULT_SETTINGS.autoRest,
    restShort:
      typeof s.restShort === 'number' && s.restShort > 0
        ? Math.round(s.restShort)
        : DEFAULT_SETTINGS.restShort,
    restLong:
      typeof s.restLong === 'number' && s.restLong > 0
        ? Math.round(s.restLong)
        : DEFAULT_SETTINGS.restLong,
    voiceCues:
      typeof s.voiceCues === 'boolean'
        ? s.voiceCues
        : DEFAULT_SETTINGS.voiceCues,
    reminder: typeof s.reminder === 'string' ? s.reminder : '',
    advanced:
      typeof s.advanced === 'boolean' ? s.advanced : DEFAULT_SETTINGS.advanced,
    haptics:
      typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
    bodyFinish: FINISHES.includes(s.bodyFinish as BodyFinish)
      ? (s.bodyFinish as BodyFinish)
      : 'standard',
    goal: GOALS.includes(s.goal as Goal) ? (s.goal as Goal) : 'maintain',
    bigText:
      typeof s.bigText === 'boolean' ? s.bigText : DEFAULT_SETTINGS.bigText,
    highContrast:
      typeof s.highContrast === 'boolean'
        ? s.highContrast
        : DEFAULT_SETTINGS.highContrast,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGetJSON<Partial<Settings>>(SETTINGS_KEY);
  return sanitizeSettings(stored);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await kvSetJSON(SETTINGS_KEY, settings);
}

export async function loadAccent(): Promise<string> {
  const id = await kvGet(ACCENT_KEY);
  return getAccent(id ?? DEFAULT_ACCENT).id;
}

export async function saveAccent(id: string): Promise<void> {
  await kvSet(ACCENT_KEY, getAccent(id).id);
}

interface SettingsContextValue {
  settings: Settings;
  accent: string;
  ready: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setAccent: (id: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [ready, setReady] = useState(false);
  // Mirror of settings for synchronous reads inside callbacks.
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, a] = await Promise.all([loadSettings(), loadAccent()]);
      if (!cancelled) {
        settingsRef.current = s;
        setSettings(s);
        setAccentState(a);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = sanitizeSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
  }, []);

  const setAccent = useCallback(async (id: string) => {
    const resolved = getAccent(id).id;
    setAccentState(resolved);
    await saveAccent(resolved);
  }, []);

  const value = useMemo(
    () => ({ settings, accent, ready, updateSettings, setAccent }),
    [settings, accent, ready, updateSettings, setAccent]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/** Full dynamic theme: static tokens plus accent, big-text and contrast. */
export function useTheme(): Theme & SettingsContextValue {
  const ctx = useSettings();
  const theme = useMemo(
    () =>
      buildTheme({
        accentId: ctx.accent,
        bigText: ctx.settings.bigText,
        highContrast: ctx.settings.highContrast,
        reduceMotion: ctx.settings.reduceMotion,
      }),
    [
      ctx.accent,
      ctx.settings.bigText,
      ctx.settings.highContrast,
      ctx.settings.reduceMotion,
    ]
  );
  return useMemo(() => ({ ...ctx, ...theme }), [ctx, theme]);
}
