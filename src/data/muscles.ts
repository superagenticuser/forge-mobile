// Muscle metadata and mannequin id helpers, ported from the web app
// (js/core.js MUSCLE_INFO, DELT_TO_GROUP, MANNEQUIN_IDS, groupOf, expandMuscles).

export interface MuscleInfo {
  name: string;
  desc: string;
  function: string;
}

export const MUSCLE_INFO: Record<string, MuscleInfo> = {
  chest: {
    name: 'Chest',
    desc: 'Pectorals. The pushing muscles behind every press, push-up and dip.',
    function:
      'Pushes your arms forward and together. Powers presses, push-ups, and hugging motions.',
  },
  back: {
    name: 'Back',
    desc: 'Rhomboids and mid-traps. A thick upper back built with rows and deadlifts.',
    function:
      'Pulls your shoulder blades together and down. Keeps posture tall and powers every row.',
  },
  lats: {
    name: 'Lats',
    desc: 'Latissimus dorsi, the wings. Pull-ups and pulldowns build width.',
    function:
      'Pulls your arms down and back toward your body. Drives pull-ups, pulldowns, and swimming strokes.',
  },
  traps: {
    name: 'Traps',
    desc: 'Trapezius. Shrugs and carries build the upper-back shelf.',
    function:
      'Shrugs and steadies your shoulders. Supports your neck and helps carry heavy loads.',
  },
  'lower-back': {
    name: 'Lower Back',
    desc: 'Erector spinae. Keeps your spine strong under load.',
    function:
      'Extends and braces your spine. Keeps you upright during lifts and everyday movement.',
  },
  shoulders: {
    name: 'Shoulders',
    desc: 'Deltoids. Pressing and raising builds capped shoulders.',
    function:
      'Lifts and rotates your arms in every direction. Caps pressing and raising movements.',
  },
  biceps: {
    name: 'Biceps',
    desc: 'Front of the upper arm. Curls of every kind.',
    function:
      'Bends your elbow and rotates your forearm. Powers curls and assists pulling.',
  },
  triceps: {
    name: 'Triceps',
    desc: 'Back of the upper arm. About two thirds of your arm size.',
    function:
      'Straightens your elbow. Drives pushdowns, dips, and locks out every press.',
  },
  forearms: {
    name: 'Forearms',
    desc: 'Grip strength. Carries, hangs and wrist work.',
    function:
      'Grips, twists, and stabilizes your wrist. Transfers strength from hand to bar.',
  },
  abs: {
    name: 'Abs',
    desc: 'Rectus abdominis, the six-pack wall. Train it with resistance.',
    function:
      'Bends your trunk forward and braces your core. Protects your spine under load.',
  },
  obliques: {
    name: 'Obliques',
    desc: 'Side core. Rotation and anti-rotation strength.',
    function:
      'Rotates and side-bends your torso. Stabilizes twists and single-sided lifts.',
  },
  glutes: {
    name: 'Glutes',
    desc: 'The powerhouse. Hip thrusts, swings and lunges.',
    function:
      'Extends your hips with force. Powers standing up, sprinting, and climbing.',
  },
  quads: {
    name: 'Quads',
    desc: 'Front of the thigh. Squats, presses and lunges.',
    function: 'Straightens your knee. Drives squats, lunges, and stairs.',
  },
  hamstrings: {
    name: 'Hamstrings',
    desc: 'Back of the thigh. Hinges, curls and Nordics.',
    function:
      'Bends your knee and extends your hip. Powers sprinting and hinging lifts.',
  },
  calves: {
    name: 'Calves',
    desc: 'Lower leg. Raises with a full stretch and squeeze.',
    function:
      'Lifts your heels to push off the ground. Drives running, jumping, and walking.',
  },
  'full-body': {
    name: 'Full Body',
    desc: 'Compound conditioning. Multiple muscles, maximum output.',
    function:
      'Coordinates every major muscle group at once. Builds power, balance, and stamina together.',
  },
  cardio: {
    name: 'Cardio',
    desc: 'Engine building. Heart, lungs and work capacity.',
    function:
      'Strengthens your heart and lungs. Builds endurance and recovery capacity.',
  },
};

/** Raw muscle mesh ids used when building the mannequin. */
export const MANNEQUIN_IDS = [
  'chest',
  'back',
  'lats',
  'traps',
  'lower-back',
  'front-delt',
  'side-delt',
  'rear-delt',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
];

/** Mesh ids that read better from the back view (web: renderBody backSide list). */
export const BACK_MUSCLES = [
  'back',
  'lats',
  'traps',
  'lower-back',
  'rear-delt',
  'triceps',
  'glutes',
  'hamstrings',
  'calves',
];

const DELT_TO_GROUP: Record<string, string> = {
  'front-delt': 'shoulders',
  'side-delt': 'shoulders',
  'rear-delt': 'shoulders',
};

/** Map a raw mesh id to its muscle group id. */
export function groupOf(muscleId: string): string {
  return DELT_TO_GROUP[muscleId] ?? muscleId;
}

/** Expand a muscle group id to the raw mesh ids it covers. */
export function expandMuscles(groupId: string): string[] {
  if (groupId === 'shoulders') return ['front-delt', 'side-delt', 'rear-delt'];
  if (groupId === 'full-body' || groupId === 'cardio')
    return MANNEQUIN_IDS.slice();
  return [groupId];
}
