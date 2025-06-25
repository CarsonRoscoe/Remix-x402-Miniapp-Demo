import { createNewDailyPrompt } from '../app/api/db';

const dailyPrompts = [
  {
    date: new Date('2025-01-01'),
    prompt: "Transform this profile picture into a character from a medieval fantasy world, complete with enchanted armor, a mystical weapon, and a magical forest backdrop. The scene should come alive with gentle movement, like leaves rustling in the wind and magical particles floating around."
  },
  {
    date: new Date('2025-01-02'),
    prompt: "Reimagine this profile picture as a cyberpunk character in a neon-lit futuristic city. Add glowing cybernetic enhancements, holographic displays, and flying cars in the background. The scene should pulse with digital energy and technological wonder."
  },
  {
    date: new Date('2025-01-03'),
    prompt: "Transform this profile picture into a superhero character with dynamic powers. Add a dramatic cape, energy effects, and a city skyline backdrop. The scene should convey strength, heroism, and the thrill of saving the day."
  },
  {
    date: new Date('2025-01-04'),
    prompt: "Reimagine this profile picture as a space explorer in a distant galaxy. Add a futuristic spacesuit, alien landscapes, and distant planets in the background. The scene should capture the wonder and mystery of space exploration."
  },
  {
    date: new Date('2025-01-05'),
    prompt: "Transform this profile picture into a magical wizard or sorcerer. Add flowing robes, mystical staff, and a magical library or ancient ruins backdrop. The scene should be filled with magical energy and arcane knowledge."
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