// GENERATED FILE. Do not hand-edit.
// Source: ~/workspace/gym-3d-v10/js/data-programs.js
// Regenerate with: node scripts/convert-data.mjs

export interface ProgramDayExercise {
  id: string;
  sets: number;
  reps: string;
}

export interface ProgramDay {
  name: string;
  exercises: ProgramDayExercise[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  level: string;
  daysPerWeek: number;
  weeks: number;
  equipment: string;
  days: ProgramDay[];
}

/** All 14 training programs, in canonical order. */
export const PROGRAMS: Program[] = [
  {
    id: 'full-body-starter',
    name: 'Full-Body Starter',
    tagline: 'Learn the fundamentals with three full-body days per week.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 4,
    equipment: 'Dumbbells + bodyweight',
    days: [
      {
        name: 'Day 1 · Full Body A',
        exercises: [
          { id: 'goblet-squat', sets: 3, reps: '10' },
          { id: 'push-up', sets: 3, reps: '8' },
          { id: 'chest-supported-dumbbell-row', sets: 3, reps: '10' },
          { id: 'glute-bridge', sets: 3, reps: '12' },
          { id: 'plank', sets: 3, reps: '30s' },
          { id: 'standing-calf-raise', sets: 2, reps: '15' },
        ],
      },
      {
        name: 'Day 2 · Full Body B',
        exercises: [
          { id: 'dumbbell-romanian-deadlift', sets: 3, reps: '10' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '10' },
          { id: 'single-arm-dumbbell-row', sets: 3, reps: '10 / side' },
          { id: 'dumbbell-curl', sets: 2, reps: '12' },
          { id: 'dumbbell-kickback', sets: 2, reps: '12' },
          { id: 'bird-dog', sets: 2, reps: '8 / side' },
        ],
      },
      {
        name: 'Day 3 · Full Body A',
        exercises: [
          { id: 'goblet-squat', sets: 3, reps: '10' },
          { id: 'push-up', sets: 3, reps: '8' },
          { id: 'chest-supported-dumbbell-row', sets: 3, reps: '10' },
          { id: 'glute-bridge', sets: 3, reps: '12' },
          { id: 'plank', sets: 3, reps: '30s' },
          { id: 'standing-calf-raise', sets: 2, reps: '15' },
        ],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    tagline: 'The classic hypertrophy split. Run it 3 to 6 days per week.',
    level: 'intermediate',
    daysPerWeek: 6,
    weeks: 8,
    equipment: 'Full gym',
    days: [
      {
        name: 'Push',
        exercises: [
          { id: 'barbell-bench-press', sets: 4, reps: '6' },
          { id: 'overhead-barbell-press', sets: 3, reps: '8' },
          { id: 'incline-dumbbell-press', sets: 3, reps: '10' },
          { id: 'lateral-raise', sets: 3, reps: '12' },
          { id: 'tricep-rope-pushdown', sets: 3, reps: '12' },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { id: 'deadlift', sets: 4, reps: '5' },
          { id: 'pull-up', sets: 4, reps: 'max' },
          { id: 'bent-over-barbell-row', sets: 3, reps: '10' },
          { id: 'face-pull', sets: 3, reps: '15' },
          { id: 'barbell-curl', sets: 3, reps: '10' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { id: 'back-squat', sets: 4, reps: '6' },
          { id: 'romanian-deadlift', sets: 3, reps: '8' },
          { id: 'leg-press', sets: 3, reps: '10' },
          { id: 'lying-leg-curl', sets: 3, reps: '12' },
          { id: 'standing-calf-raise', sets: 4, reps: '15' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    tagline: 'Train everything twice per week across four focused days.',
    level: 'intermediate',
    daysPerWeek: 4,
    weeks: 8,
    equipment: 'Full gym',
    days: [
      {
        name: 'Upper A · Strength',
        exercises: [
          { id: 'barbell-bench-press', sets: 4, reps: '6' },
          { id: 'bent-over-barbell-row', sets: 4, reps: '8' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '10' },
          { id: 'pull-up', sets: 3, reps: 'max' },
          { id: 'dumbbell-curl', sets: 2, reps: '12' },
        ],
      },
      {
        name: 'Lower A · Strength',
        exercises: [
          { id: 'back-squat', sets: 4, reps: '6' },
          { id: 'romanian-deadlift', sets: 3, reps: '8' },
          { id: 'leg-press', sets: 3, reps: '10' },
          { id: 'standing-calf-raise', sets: 3, reps: '15' },
        ],
      },
      {
        name: 'Upper B · Volume',
        exercises: [
          { id: 'overhead-barbell-press', sets: 4, reps: '8' },
          { id: 'incline-dumbbell-press', sets: 3, reps: '10' },
          { id: 'single-arm-dumbbell-row', sets: 3, reps: '10 / side' },
          { id: 'lateral-raise', sets: 3, reps: '12' },
          { id: 'tricep-rope-pushdown', sets: 3, reps: '12' },
        ],
      },
      {
        name: 'Lower B · Volume',
        exercises: [
          { id: 'deadlift', sets: 3, reps: '5' },
          { id: 'front-squat', sets: 3, reps: '8' },
          { id: 'bulgarian-split-squat', sets: 3, reps: '10 / side' },
          { id: 'seated-calf-raise', sets: 3, reps: '15' },
        ],
      },
    ],
  },
  {
    id: 'strength-5x5',
    name: '5×5 Strength',
    tagline: 'Simple, heavy and effective. Add weight every session.',
    level: 'intermediate',
    daysPerWeek: 3,
    weeks: 12,
    equipment: 'Barbell',
    days: [
      {
        name: 'Workout A',
        exercises: [
          { id: 'back-squat', sets: 5, reps: '5' },
          { id: 'barbell-bench-press', sets: 5, reps: '5' },
          { id: 'bent-over-barbell-row', sets: 5, reps: '5' },
        ],
      },
      {
        name: 'Workout B',
        exercises: [
          { id: 'back-squat', sets: 5, reps: '5' },
          { id: 'overhead-barbell-press', sets: 5, reps: '5' },
          { id: 'deadlift', sets: 1, reps: '5' },
        ],
      },
    ],
  },
  {
    id: 'dumbbell-home',
    name: 'Dumbbell-Only Home',
    tagline: 'One pair of dumbbells. Full-body results at home.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 6,
    equipment: 'Dumbbells',
    days: [
      {
        name: 'Full Body',
        exercises: [
          { id: 'goblet-squat', sets: 3, reps: '12' },
          { id: 'dumbbell-floor-press', sets: 3, reps: '10' },
          { id: 'single-arm-dumbbell-row', sets: 3, reps: '10 / side' },
          { id: 'dumbbell-romanian-deadlift', sets: 3, reps: '10' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '10' },
          { id: 'dumbbell-curl', sets: 2, reps: '12' },
          { id: 'dumbbell-kickback', sets: 2, reps: '12' },
          { id: 'plank', sets: 3, reps: '45s' },
        ],
      },
    ],
  },
  {
    id: 'hiit-conditioning',
    name: 'HIIT Conditioning',
    tagline: 'Build your engine. Three to four rounds with minimal rest.',
    level: 'intermediate',
    daysPerWeek: 3,
    weeks: 4,
    equipment: 'Bodyweight + kettlebell',
    days: [
      {
        name: 'Circuit · 3 to 4 rounds',
        exercises: [
          { id: 'burpee', sets: 1, reps: '40s' },
          { id: 'kettlebell-swing', sets: 1, reps: '40s' },
          { id: 'mountain-climbers', sets: 1, reps: '40s' },
          { id: 'battle-ropes', sets: 1, reps: '30s' },
          { id: 'box-jump', sets: 1, reps: '30s' },
          { id: 'bear-crawl', sets: 1, reps: '40s' },
          { id: 'jump-rope', sets: 1, reps: '60s' },
          { id: 'devil-press', sets: 1, reps: '30s' },
        ],
      },
    ],
  },
  {
    id: 'powerbuilding',
    name: 'Powerbuilding',
    tagline: 'Heavy compounds for strength, volume work for size. 4 days.',
    level: 'intermediate',
    daysPerWeek: 4,
    weeks: 8,
    equipment: 'Full gym',
    days: [
      {
        name: 'Day 1 · Upper Strength',
        exercises: [
          { id: 'barbell-bench-press', sets: 5, reps: '5' },
          { id: 'bent-over-barbell-row', sets: 4, reps: '8' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '10' },
          { id: 'lat-pulldown', sets: 3, reps: '12' },
        ],
      },
      {
        name: 'Day 2 · Lower Strength',
        exercises: [
          { id: 'back-squat', sets: 5, reps: '5' },
          { id: 'romanian-deadlift', sets: 3, reps: '10' },
          { id: 'leg-press', sets: 3, reps: '12' },
          { id: 'plank', sets: 3, reps: '60s' },
        ],
      },
      {
        name: 'Day 3 · Upper Volume',
        exercises: [
          { id: 'barbell-bench-press', sets: 4, reps: '10' },
          { id: 'pull-up', sets: 4, reps: '8' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '12' },
          { id: 'push-up', sets: 3, reps: '15' },
        ],
      },
      {
        name: 'Day 4 · Lower Volume',
        exercises: [
          { id: 'deadlift', sets: 4, reps: '6' },
          { id: 'front-squat', sets: 3, reps: '10' },
          { id: 'bulgarian-split-squat', sets: 3, reps: '10 / side' },
          { id: 'plank', sets: 3, reps: '60s' },
        ],
      },
    ],
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics Skills',
    tagline: 'Master your bodyweight. Progress from basics to advanced skills.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 8,
    equipment: 'Bodyweight + pull-up bar',
    days: [
      {
        name: 'Day 1 · Push',
        exercises: [
          { id: 'push-up', sets: 4, reps: '12' },
          { id: 'plank', sets: 3, reps: '60s' },
          { id: 'push-up', sets: 3, reps: '8' },
        ],
      },
      {
        name: 'Day 2 · Pull',
        exercises: [
          { id: 'pull-up', sets: 4, reps: '6' },
          { id: 'plank', sets: 3, reps: '60s' },
        ],
      },
      {
        name: 'Day 3 · Legs + Core',
        exercises: [
          { id: 'goblet-squat', sets: 4, reps: '15' },
          { id: 'bulgarian-split-squat', sets: 3, reps: '10 / side' },
          { id: 'plank', sets: 3, reps: '60s' },
        ],
      },
    ],
  },
  {
    id: 'runner-strength',
    name: "Runner's Strength",
    tagline: 'Injury-proof your running. 2 days, single-leg focus.',
    level: 'beginner',
    daysPerWeek: 2,
    weeks: 6,
    equipment: 'Dumbbells + bodyweight',
    days: [
      {
        name: 'Day 1 · Legs',
        exercises: [
          { id: 'goblet-squat', sets: 3, reps: '12' },
          { id: 'bulgarian-split-squat', sets: 3, reps: '10 / side' },
          { id: 'romanian-deadlift', sets: 3, reps: '10' },
          { id: 'plank', sets: 3, reps: '45s' },
        ],
      },
      {
        name: 'Day 2 · Full Body',
        exercises: [
          { id: 'push-up', sets: 3, reps: '12' },
          { id: 'goblet-squat', sets: 3, reps: '12' },
          { id: 'dumbbell-shoulder-press', sets: 3, reps: '10' },
          { id: 'plank', sets: 3, reps: '45s' },
        ],
      },
    ],
  },
  {
    id: 'kettlebell-foundations',
    name: 'Kettlebell Foundations',
    tagline: 'Swing, clean, press and carry your way to full-body power.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 6,
    equipment: 'Kettlebells',
    days: [
      {
        name: 'Day 1 · Hinge Power',
        exercises: [
          {
            id: 'kettlebell-deadlift',
            sets: 3,
            reps: '10',
          },
          {
            id: 'kettlebell-swing',
            sets: 4,
            reps: '15',
          },
          {
            id: 'kettlebell-single-leg-deadlift',
            sets: 3,
            reps: '8 / side',
          },
          {
            id: 'plank',
            sets: 3,
            reps: '30s',
          },
        ],
      },
      {
        name: 'Day 2 · Press + Carry',
        exercises: [
          {
            id: 'kettlebell-press',
            sets: 3,
            reps: '8 / side',
          },
          {
            id: 'kettlebell-halo',
            sets: 2,
            reps: '8 / side',
          },
          {
            id: 'kettlebell-farmer-carry',
            sets: 3,
            reps: '40m',
          },
          {
            id: 'band-pull-apart',
            sets: 2,
            reps: '15',
          },
        ],
      },
      {
        name: 'Day 3 · Clean + Squat',
        exercises: [
          {
            id: 'kettlebell-clean',
            sets: 4,
            reps: '6 / side',
          },
          {
            id: 'kettlebell-front-squat',
            sets: 3,
            reps: '8',
          },
          {
            id: 'kettlebell-gorilla-row',
            sets: 3,
            reps: '8 / side',
          },
          {
            id: 'dead-bug',
            sets: 2,
            reps: '10 / side',
          },
        ],
      },
    ],
  },
  {
    id: 'cable-hypertrophy',
    name: 'Cable-Only Hypertrophy',
    tagline: 'One cable station, complete muscle coverage across four days.',
    level: 'intermediate',
    daysPerWeek: 4,
    weeks: 8,
    equipment: 'Cable machine',
    days: [
      {
        name: 'Push',
        exercises: [
          {
            id: 'cable-chest-press',
            sets: 4,
            reps: '10',
          },
          {
            id: 'low-to-high-cable-fly',
            sets: 3,
            reps: '12',
          },
          {
            id: 'cable-upright-row',
            sets: 3,
            reps: '12',
          },
          {
            id: 'tricep-rope-pushdown',
            sets: 3,
            reps: '12',
          },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          {
            id: 'seated-cable-row',
            sets: 4,
            reps: '10',
          },
          {
            id: 'lat-pulldown',
            sets: 3,
            reps: '12',
          },
          {
            id: 'cable-hammer-curl',
            sets: 3,
            reps: '12',
          },
          {
            id: 'face-pull',
            sets: 3,
            reps: '15',
          },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          {
            id: 'cable-split-squat',
            sets: 3,
            reps: '10 / side',
          },
          {
            id: 'cable-hip-extension',
            sets: 3,
            reps: '12 / side',
          },
          {
            id: 'cable-single-leg-rdl',
            sets: 3,
            reps: '10 / side',
          },
          {
            id: 'standing-cable-crunch',
            sets: 3,
            reps: '15',
          },
        ],
      },
      {
        name: 'Arms + Core',
        exercises: [
          {
            id: 'bayesian-cable-curl',
            sets: 3,
            reps: '12',
          },
          {
            id: 'cross-body-cable-extension',
            sets: 3,
            reps: '12',
          },
          {
            id: 'cable-oblique-twist',
            sets: 3,
            reps: '12 / side',
          },
          {
            id: 'cable-side-bend',
            sets: 2,
            reps: '12 / side',
          },
        ],
      },
    ],
  },
  {
    id: 'bodyweight-progression',
    name: 'Bodyweight Progression',
    tagline: 'From wall push-ups to clapping push-ups and skater squats.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 8,
    equipment: 'Bodyweight only',
    days: [
      {
        name: 'Day 1 · Push',
        exercises: [
          {
            id: 'wall-push-up',
            sets: 3,
            reps: '15',
          },
          {
            id: 'push-up',
            sets: 4,
            reps: '10',
          },
          {
            id: 'scapular-push-up',
            sets: 2,
            reps: '12',
          },
          {
            id: 'hindu-push-up',
            sets: 3,
            reps: '8',
          },
          {
            id: 'bench-dip',
            sets: 3,
            reps: '10',
          },
        ],
      },
      {
        name: 'Day 2 · Pull + Legs',
        exercises: [
          {
            id: 'inverted-row',
            sets: 4,
            reps: '8',
          },
          {
            id: 'dead-hang',
            sets: 3,
            reps: '30s',
          },
          {
            id: 'reverse-lunge',
            sets: 3,
            reps: '10 / side',
          },
          {
            id: 'bulgarian-split-squat',
            sets: 3,
            reps: '8 / side',
          },
          {
            id: 'wall-sit',
            sets: 3,
            reps: '45s',
          },
        ],
      },
      {
        name: 'Day 3 · Core + Skills',
        exercises: [
          {
            id: 'tuck-up',
            sets: 3,
            reps: '12',
          },
          {
            id: 'hollow-rock',
            sets: 3,
            reps: '20s',
          },
          {
            id: 'spiderman-push-up',
            sets: 3,
            reps: '6 / side',
          },
          {
            id: 'jumping-lunge',
            sets: 3,
            reps: '10',
          },
          {
            id: 'bird-dog',
            sets: 2,
            reps: '8 / side',
          },
        ],
      },
    ],
  },
  {
    id: 'mobility-reset',
    name: 'Daily Mobility Reset',
    tagline: 'Ten focused minutes a day to move better and ache less.',
    level: 'beginner',
    daysPerWeek: 5,
    weeks: 4,
    equipment: 'Bodyweight only',
    days: [
      {
        name: 'Day 1 · Hips',
        exercises: [
          {
            id: '90-90-hip-switch',
            sets: 2,
            reps: '8 / side',
          },
          {
            id: 'pigeon-stretch',
            sets: 2,
            reps: '60s / side',
          },
          {
            id: 'deep-squat-hold',
            sets: 3,
            reps: '30s',
          },
          {
            id: 'couch-stretch',
            sets: 2,
            reps: '60s / side',
          },
        ],
      },
      {
        name: 'Day 2 · Spine',
        exercises: [
          {
            id: 'cat-cow',
            sets: 2,
            reps: '10',
          },
          {
            id: 'prone-t-spine-rotation',
            sets: 2,
            reps: '8 / side',
          },
          {
            id: 'world-greatest-stretch',
            sets: 2,
            reps: '5 / side',
          },
          {
            id: 'dead-hang',
            sets: 3,
            reps: '20s',
          },
        ],
      },
      {
        name: 'Day 3 · Full Flow',
        exercises: [
          {
            id: 'inchworm',
            sets: 3,
            reps: '6',
          },
          {
            id: 'world-greatest-stretch',
            sets: 2,
            reps: '5 / side',
          },
          {
            id: 'band-pass-through',
            sets: 2,
            reps: '10',
          },
          {
            id: 'scapular-push-up',
            sets: 2,
            reps: '10',
          },
        ],
      },
      {
        name: 'Day 4 · Hips + Hamstrings',
        exercises: [
          {
            id: 'couch-stretch',
            sets: 2,
            reps: '60s / side',
          },
          {
            id: 'pigeon-stretch',
            sets: 2,
            reps: '60s / side',
          },
          {
            id: 'inchworm',
            sets: 3,
            reps: '6',
          },
          {
            id: 'deep-squat-hold',
            sets: 3,
            reps: '30s',
          },
        ],
      },
      {
        name: 'Day 5 · Upper Body',
        exercises: [
          {
            id: 'band-pass-through',
            sets: 2,
            reps: '10',
          },
          {
            id: 'prone-t-spine-rotation',
            sets: 2,
            reps: '8 / side',
          },
          {
            id: 'cat-cow',
            sets: 2,
            reps: '10',
          },
          {
            id: 'wall-push-up',
            sets: 2,
            reps: '12',
          },
        ],
      },
    ],
  },
  {
    id: 'band-home-workout',
    name: 'Band-Only Home Workout',
    tagline: 'A full training split with nothing but resistance bands.',
    level: 'beginner',
    daysPerWeek: 3,
    weeks: 6,
    equipment: 'Resistance bands',
    days: [
      {
        name: 'Full Body A',
        exercises: [
          {
            id: 'band-pass-through',
            sets: 2,
            reps: '10',
          },
          {
            id: 'band-chest-press',
            sets: 3,
            reps: '12',
          },
          {
            id: 'band-row',
            sets: 3,
            reps: '12',
          },
          {
            id: 'banded-glute-bridge',
            sets: 3,
            reps: '15',
          },
          {
            id: 'band-curl',
            sets: 2,
            reps: '15',
          },
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          {
            id: 'band-shoulder-press',
            sets: 3,
            reps: '12',
          },
          {
            id: 'band-row',
            sets: 3,
            reps: '12',
          },
          {
            id: 'banded-glute-bridge',
            sets: 3,
            reps: '15',
          },
          {
            id: 'band-pushdown',
            sets: 2,
            reps: '15',
          },
          {
            id: 'band-pull-apart',
            sets: 2,
            reps: '15',
          },
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          {
            id: 'band-chest-press',
            sets: 3,
            reps: '12',
          },
          {
            id: 'band-shoulder-press',
            sets: 3,
            reps: '12',
          },
          {
            id: 'band-row',
            sets: 3,
            reps: '12',
          },
          {
            id: 'band-curl',
            sets: 2,
            reps: '15',
          },
          {
            id: 'band-pushdown',
            sets: 2,
            reps: '15',
          },
        ],
      },
    ],
  },
];
