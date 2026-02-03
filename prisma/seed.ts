import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const defaultExercises = [
  {
    name: "Barbell Back Squat",
    category: "Strength",
    muscles: ["Quads", "Glutes", "Core"],
    equipment: "Barbell",
    type: "weight",
    instructions:
      "Stand with feet shoulder-width apart. Bar rests on upper back. Bend knees and hips to lower down, keeping chest up. Drive through heels to stand.",
  },
  {
    name: "Bench Press",
    category: "Strength",
    muscles: ["Chest", "Triceps", "Shoulders"],
    equipment: "Barbell",
    type: "weight",
    instructions:
      "Lie on bench, grip bar slightly wider than shoulders. Lower bar to chest, then press up to full extension.",
  },
  {
    name: "Deadlift",
    category: "Strength",
    muscles: ["Back", "Glutes", "Hamstrings"],
    equipment: "Barbell",
    type: "weight",
    instructions:
      "Stand with feet hip-width, bar over midfoot. Hinge at hips, grip bar. Drive through floor, keeping back flat, until standing.",
  },
  {
    name: "Pull-ups",
    category: "Strength",
    muscles: ["Back", "Biceps"],
    equipment: "Pull-up Bar",
    type: "weight",
    instructions:
      "Hang from bar with overhand grip. Pull body up until chin clears bar. Lower with control.",
  },
  {
    name: "Overhead Press",
    category: "Strength",
    muscles: ["Shoulders", "Triceps"],
    equipment: "Barbell",
    type: "weight",
    instructions:
      "Stand with bar at shoulders. Press overhead to full lockout. Lower with control.",
  },
  {
    name: "Barbell Row",
    category: "Strength",
    muscles: ["Back", "Biceps"],
    equipment: "Barbell",
    type: "weight",
    instructions:
      "Hinge forward at hips, back flat. Pull bar to lower chest, squeezing shoulder blades. Lower with control.",
  },
  {
    name: "Lunges",
    category: "Strength",
    muscles: ["Quads", "Glutes"],
    equipment: "Dumbbells",
    type: "weight",
    instructions:
      "Step forward into a lunge, lowering back knee toward floor. Push through front heel to return.",
  },
  {
    name: "Dumbbell Curl",
    category: "Strength",
    muscles: ["Biceps"],
    equipment: "Dumbbells",
    type: "weight",
    instructions:
      "Stand with dumbbells at sides. Curl weights up, keeping elbows stationary. Lower with control.",
  },
  {
    name: "Tricep Pushdown",
    category: "Strength",
    muscles: ["Triceps"],
    equipment: "Cable",
    type: "weight",
    instructions:
      "Stand at cable machine, grip bar. Push down until arms are straight. Return with control.",
  },
  {
    name: "Leg Press",
    category: "Strength",
    muscles: ["Quads", "Glutes"],
    equipment: "Machine",
    type: "weight",
    instructions:
      "Sit in machine, feet shoulder-width on platform. Lower weight by bending knees, then press back up.",
  },
  {
    name: "Treadmill Run",
    category: "Cardio",
    muscles: ["Full Body"],
    equipment: "Treadmill",
    type: "cardio",
    instructions: "Maintain steady pace with good posture. Land midfoot, keep arms relaxed.",
  },
  {
    name: "Rowing Machine",
    category: "Cardio",
    muscles: ["Full Body"],
    equipment: "Rower",
    type: "cardio",
    instructions:
      "Drive with legs first, then lean back slightly and pull handle to chest. Return in reverse order.",
  },
  {
    name: "Cycling",
    category: "Cardio",
    muscles: ["Legs"],
    equipment: "Bike",
    type: "cardio",
    instructions: "Maintain steady cadence. Adjust resistance for desired intensity.",
  },
  {
    name: "Jump Rope",
    category: "Cardio",
    muscles: ["Full Body"],
    equipment: "Jump Rope",
    type: "cardio",
    instructions:
      "Jump with feet together, using wrists to turn rope. Land softly on balls of feet.",
  },
  {
    name: "Plank",
    category: "Core",
    muscles: ["Core"],
    equipment: "None",
    type: "timed",
    instructions:
      "Support body on forearms and toes. Keep body in straight line, core tight.",
  },
  {
    name: "Russian Twist",
    category: "Core",
    muscles: ["Core", "Obliques"],
    equipment: "None",
    type: "weight",
    instructions:
      "Sit with knees bent, lean back slightly. Rotate torso side to side, keeping core engaged.",
  },
];

async function main() {
  console.log("Seeding default exercises...");

  for (const exercise of defaultExercises) {
    const id = exercise.name.toLowerCase().replace(/\s+/g, "-");

    // Check if exercise exists
    const existing = await prisma.exercise.findUnique({ where: { id } });

    if (existing) {
      await prisma.exercise.update({
        where: { id },
        data: exercise,
      });
    } else {
      await prisma.exercise.create({
        data: {
          id,
          ...exercise,
          custom: false,
        },
      });
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
