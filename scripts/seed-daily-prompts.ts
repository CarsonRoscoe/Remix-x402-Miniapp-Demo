import { createNewDailyPrompt } from '../app/api/db';

const dailyPrompts = [
  {
    date: new Date('2025-07-08'),
    prompt: "Turn this profile picture into a dramatic slow-motion scene of the character heroically saving a slice of pizza from falling, with epic music, wind blowing, and confetti exploding everywhere. Add exaggerated facial expressions and cartoonish effects for maximum silliness"
  },
  {
    date: new Date('2025-07-09'),
    prompt: "Transform this profile picture into a retro video game boss fight screen, complete with pixel art, over-the-top health bars, attack animations, and a 'Press Start' overlay."
  },
  {
    date: new Date('2025-07-10'),
    prompt: "Remix this profile picture as a contestant in a high-stakes reality cooking show, mid-challenge, with flames rising in the background, sweat on the brow, and dramatic judging panel reactions."
  },
  {
    date: new Date('2025-07-11'),
    prompt: "Reimagine this profile picture as an 80s-style glam rock album cover, complete with big hair, neon lights, electric guitars, and lightning bolts in the background."
  },
  {
    date: new Date('2025-07-12'),
    prompt: "Turn this profile picture into a dramatic courtroom sketch during a wildly over-the-top trial, with shocked jurors, a yelling lawyer, and a gavel mid-slam."
  },
  {
    date: new Date('2025-07-13'),
    prompt: "Transform this profile picture into a wild west wanted poster, weathered and torn, with a bounty reward, outlaw nickname, and a dramatic sunset showdown scene behind it."
  },
  {
    date: new Date('2025-07-14'),
    prompt: "Remix this profile picture as a cinematic spy movie poster—sunglasses, explosions, high-tech gadgets, and a tagline like 'The Name's [Username]… Remix Name.'"
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