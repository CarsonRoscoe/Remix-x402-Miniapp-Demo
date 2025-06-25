import { createNewDailyPrompt } from '../app/api/db';

const dailyPrompts = [
  {
    date: new Date('2025-06-25'),
    prompt: "Transform this profile picture into a character from a medieval fantasy world, complete with enchanted armor, a mystical weapon, and a magical forest backdrop. The scene should come alive with gentle movement, like leaves rustling in the wind and magical particles floating around."
  },
  {
    date: new Date('2025-06-26'),
    prompt: "Reimagine this profile picture as a cyberpunk character in a neon-lit futuristic city. Add glowing cybernetic enhancements, holographic displays, and flying cars in the background. The scene should pulse with digital energy and technological wonder."
  },
  {
    date: new Date('2025-06-27'),
    prompt: "Transform this profile picture into a superhero character with dynamic powers. Add a dramatic cape, energy effects, and a city skyline backdrop. The scene should convey strength, heroism, and the thrill of saving the day."
  },
  {
    date: new Date('2025-06-28'),
    prompt: "Reimagine this profile picture as a space explorer in a distant galaxy. Add a futuristic spacesuit, alien landscapes, and distant planets in the background. The scene should capture the wonder and mystery of space exploration."
  },
  {
    date: new Date('2025-06-29'),
    prompt: "Transform this profile picture into a magical wizard or sorcerer. Add flowing robes, mystical staff, and a magical library or ancient ruins backdrop. The scene should be filled with magical energy and arcane knowledge."
  },
  {
    date: new Date('2025-06-30'),
    prompt: "Transform this profile picture into a 1980s arcade game character. Add pixel art effects, neon grids, retro UI overlays, and classic arcade ambiance with flickering lights and synthwave vibes."
  },
  {
    date: new Date('2025-07-01'),
    prompt: "Reimagine this profile picture as an underwater explorer in a bioluminescent ocean. Add a deep-sea suit, glowing sea creatures, coral reefs, and shimmering light rays from the surface above."
  },
  {
    date: new Date('2025-07-02'),
    prompt: "Transform this profile picture into a steampunk inventor in a gear-filled workshop. Add brass goggles, mechanical arms, steam vents, and animated blueprints floating in midair."
  },
  {
    date: new Date('2025-07-03'),
    prompt: "Reimagine this profile picture as a character in a Japanese anime intro. Add cinematic lighting, fast motion streaks, and dynamic poses with vibrant background transitions and energetic music cues."
  },
  {
    date: new Date('2025-07-04'),
    prompt: "Transform this profile picture into a mythological creature or deity. Add divine elements like glowing eyes, celestial symbols, and a dramatic sky or sacred mountain in the background."
  },
  {
    date: new Date('2025-07-05'),
    prompt: "Reimagine this profile picture as a time traveler leaping between eras. Blend futuristic tech with ancient settings like pyramids or castles, and animate glitches or time portals swirling around them."
  },
  {
    date: new Date('2025-07-06'),
    prompt: "Transform this profile picture into a cartoon food mascot. Turn them into a character made from or themed around their favorite food, with playful animations and a colorful, pop-art style kitchen background."
  },
  {
    date: new Date('2025-07-07'),
    prompt: "Reimagine this profile picture as a festival performer at a vibrant global celebration. Add cultural attire, music instruments, floating confetti, and animated dancing lights matching the beat."
  },
  {
    date: new Date('2025-07-08'),
    prompt: "Transform this profile picture into a post-apocalyptic survivor. Add dusty gear, makeshift armor, and a ruined city or desert wasteland background, with wind-blown sand and flickering fires."
  },
  {
    date: new Date('2025-07-09'),
    prompt: "Reimagine this profile picture as a forest guardian or woodland spirit. Add floral accents, glowing eyes, animal companions, and animate nature gently moving in the background like wind through trees."
  }
];


async function seedDailyPrompts() {
  console.log('🌱 Seeding daily prompts...');
  
  for (const promptData of dailyPrompts) {
    try {
      const prompt = await createNewDailyPrompt(promptData);
      console.log(`✅ Created prompt for ${promptData.date.toISOString().split('T')[0]}: ${prompt.prompt.substring(0, 50)}...`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`⚠️  Prompt for ${promptData.date.toISOString().split('T')[0]} already exists, skipping...`);
      } else {
        console.error(`❌ Error creating prompt for ${promptData.date.toISOString().split('T')[0]}:`, error);
      }
    }
  }
  
  console.log('🎉 Daily prompts seeding completed!');
}

// Run the seeding function
seedDailyPrompts()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }); 