import { db } from "./db";
import { subscriptionTemplates } from "@shared/schema";
import type { InsertSubscriptionTemplate } from "@shared/schema";

const templates: InsertSubscriptionTemplate[] = [
  // Streaming Services (15)
  { name: "Netflix", category: "Streaming", suggestedPrice: "15.49", billingCycle: "Monthly", description: "Movies and TV shows", popularity: "100" },
  { name: "Disney+", category: "Streaming", suggestedPrice: "13.99", billingCycle: "Monthly", description: "Disney, Pixar, Marvel, Star Wars", popularity: "95" },
  { name: "Max (HBO Max)", category: "Streaming", suggestedPrice: "15.99", billingCycle: "Monthly", description: "HBO, Warner Bros content", popularity: "90" },
  { name: "Hulu", category: "Streaming", suggestedPrice: "17.99", billingCycle: "Monthly", description: "TV shows and movies", popularity: "88" },
  { name: "Amazon Prime Video", category: "Streaming", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Movies, TV, Amazon Originals", popularity: "92" },
  { name: "Apple TV+", category: "Streaming", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Apple Original shows and movies", popularity: "85" },
  { name: "Peacock", category: "Streaming", suggestedPrice: "11.99", billingCycle: "Monthly", description: "NBCUniversal content", popularity: "75" },
  { name: "Paramount+", category: "Streaming", suggestedPrice: "11.99", billingCycle: "Monthly", description: "CBS, Paramount Pictures content", popularity: "70" },
  { name: "Crunchyroll", category: "Streaming", suggestedPrice: "11.99", billingCycle: "Monthly", description: "Anime streaming", popularity: "80" },
  { name: "YouTube Premium", category: "Streaming", suggestedPrice: "13.99", billingCycle: "Monthly", description: "Ad-free YouTube and YouTube Music", popularity: "85" },
  { name: "Discovery+", category: "Streaming", suggestedPrice: "8.99", billingCycle: "Monthly", description: "Discovery Channel content", popularity: "65" },
  { name: "Showtime", category: "Streaming", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Showtime original series", popularity: "60" },
  { name: "Starz", category: "Streaming", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Movies and original series", popularity: "58" },
  { name: "ESPN+", category: "Streaming", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Live sports and originals", popularity: "72" },
  { name: "Criterion Channel", category: "Streaming", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Classic and art-house films", popularity: "55" },

  // Music Streaming (12)
  { name: "Spotify Premium", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Ad-free music streaming", popularity: "98" },
  { name: "Apple Music", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "100M+ songs", popularity: "95" },
  { name: "YouTube Music Premium", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Ad-free music", popularity: "82" },
  { name: "Amazon Music Unlimited", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "100M+ songs", popularity: "80" },
  { name: "Tidal", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Hi-fi music streaming", popularity: "68" },
  { name: "Pandora Plus", category: "Music", suggestedPrice: "4.99", billingCycle: "Monthly", description: "Ad-free radio", popularity: "70" },
  { name: "Deezer Premium", category: "Music", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Music streaming", popularity: "62" },
  { name: "SoundCloud Go+", category: "Music", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Ad-free music and podcasts", popularity: "60" },
  { name: "Qobuz", category: "Music", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Hi-res music streaming", popularity: "52" },
  { name: "Audible", category: "Music", suggestedPrice: "14.95", billingCycle: "Monthly", description: "Audiobooks and podcasts", popularity: "78" },
  { name: "Amazon Music Prime", category: "Music", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Music for Prime members", popularity: "75" },
  { name: "SiriusXM", category: "Music", suggestedPrice: "16.98", billingCycle: "Monthly", description: "Satellite radio", popularity: "65" },

  // Software & Productivity (20)
  { name: "Adobe Creative Cloud", category: "Software", suggestedPrice: "54.99", billingCycle: "Monthly", description: "Photoshop, Illustrator, Premiere", popularity: "92" },
  { name: "Microsoft 365", category: "Productivity", suggestedPrice: "6.99", billingCycle: "Monthly", description: "Office apps and OneDrive", popularity: "95" },
  { name: "Notion", category: "Productivity", suggestedPrice: "10.00", billingCycle: "Monthly", description: "Notes and project management", popularity: "88" },
  { name: "Grammarly Premium", category: "Productivity", suggestedPrice: "12.00", billingCycle: "Monthly", description: "Advanced writing assistant", popularity: "82" },
  { name: "Canva Pro", category: "Software", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Graphic design tool", popularity: "85" },
  { name: "Adobe Acrobat Pro", category: "Software", suggestedPrice: "19.99", billingCycle: "Monthly", description: "PDF editing", popularity: "75" },
  { name: "Figma Professional", category: "Software", suggestedPrice: "15.00", billingCycle: "Monthly", description: "Design and prototyping", popularity: "80" },
  { name: "Slack Pro", category: "Productivity", suggestedPrice: "7.25", billingCycle: "Monthly", description: "Team communication", popularity: "78" },
  { name: "Zoom Pro", category: "Productivity", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Video conferencing", popularity: "82" },
  { name: "Evernote Premium", category: "Productivity", suggestedPrice: "7.99", billingCycle: "Monthly", description: "Note-taking app", popularity: "72" },
  { name: "1Password", category: "Software", suggestedPrice: "2.99", billingCycle: "Monthly", description: "Password manager", popularity: "75" },
  { name: "LastPass Premium", category: "Software", suggestedPrice: "3.00", billingCycle: "Monthly", description: "Password manager", popularity: "70" },
  { name: "Dashlane Premium", category: "Software", suggestedPrice: "4.99", billingCycle: "Monthly", description: "Password manager", popularity: "68" },
  { name: "Todoist Premium", category: "Productivity", suggestedPrice: "4.00", billingCycle: "Monthly", description: "Task management", popularity: "70" },
  { name: "Trello Premium", category: "Productivity", suggestedPrice: "5.00", billingCycle: "Monthly", description: "Project boards", popularity: "72" },
  { name: "Asana Premium", category: "Productivity", suggestedPrice: "10.99", billingCycle: "Monthly", description: "Project management", popularity: "75" },
  { name: "Monday.com", category: "Productivity", suggestedPrice: "8.00", billingCycle: "Monthly", description: "Work management", popularity: "73" },
  { name: "ClickUp Unlimited", category: "Productivity", suggestedPrice: "7.00", billingCycle: "Monthly", description: "Productivity platform", popularity: "68" },
  { name: "GitHub Pro", category: "Software", suggestedPrice: "4.00", billingCycle: "Monthly", description: "Code hosting", popularity: "80" },
  { name: "GitLab Premium", category: "Software", suggestedPrice: "19.00", billingCycle: "Monthly", description: "DevOps platform", popularity: "65" },

  // Cloud Storage (10)
  { name: "Dropbox Plus", category: "Cloud Storage", suggestedPrice: "11.99", billingCycle: "Monthly", description: "2TB cloud storage", popularity: "85" },
  { name: "Google One (200GB)", category: "Cloud Storage", suggestedPrice: "2.99", billingCycle: "Monthly", description: "Google Drive storage", popularity: "90" },
  { name: "Google One (2TB)", category: "Cloud Storage", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Google Drive storage", popularity: "82" },
  { name: "iCloud+ (200GB)", category: "Cloud Storage", suggestedPrice: "2.99", billingCycle: "Monthly", description: "Apple cloud storage", popularity: "88" },
  { name: "iCloud+ (2TB)", category: "Cloud Storage", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Apple cloud storage", popularity: "80" },
  { name: "OneDrive (100GB)", category: "Cloud Storage", suggestedPrice: "1.99", billingCycle: "Monthly", description: "Microsoft cloud storage", popularity: "75" },
  { name: "pCloud Premium", category: "Cloud Storage", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Secure cloud storage", popularity: "65" },
  { name: "MEGA Pro I", category: "Cloud Storage", suggestedPrice: "5.79", billingCycle: "Monthly", description: "Encrypted cloud storage", popularity: "62" },
  { name: "Box Personal Pro", category: "Cloud Storage", suggestedPrice: "10.00", billingCycle: "Monthly", description: "Cloud content management", popularity: "60" },
  { name: "Sync.com Pro", category: "Cloud Storage", suggestedPrice: "8.00", billingCycle: "Monthly", description: "Secure cloud storage", popularity: "58" },

  // Gaming (12)
  { name: "Xbox Game Pass Ultimate", category: "Gaming", suggestedPrice: "16.99", billingCycle: "Monthly", description: "100+ games on console, PC, cloud", popularity: "92" },
  { name: "PlayStation Plus Premium", category: "Gaming", suggestedPrice: "17.99", billingCycle: "Monthly", description: "Online play and game library", popularity: "88" },
  { name: "Nintendo Switch Online", category: "Gaming", suggestedPrice: "3.99", billingCycle: "Monthly", description: "Online play and classic games", popularity: "85" },
  { name: "EA Play", category: "Gaming", suggestedPrice: "4.99", billingCycle: "Monthly", description: "EA games library", popularity: "75" },
  { name: "Ubisoft+", category: "Gaming", suggestedPrice: "17.99", billingCycle: "Monthly", description: "Ubisoft games library", popularity: "68" },
  { name: "Apple Arcade", category: "Gaming", suggestedPrice: "6.99", billingCycle: "Monthly", description: "200+ mobile games", popularity: "72" },
  { name: "GeForce NOW Priority", category: "Gaming", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Cloud gaming", popularity: "70" },
  { name: "Discord Nitro", category: "Gaming", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Premium Discord features", popularity: "78" },
  { name: "Twitch Turbo", category: "Gaming", suggestedPrice: "8.99", billingCycle: "Monthly", description: "Ad-free Twitch", popularity: "65" },
  { name: "PlayStation Plus Essential", category: "Gaming", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Online play", popularity: "82" },
  { name: "Humble Choice", category: "Gaming", suggestedPrice: "11.99", billingCycle: "Monthly", description: "Monthly game bundle", popularity: "62" },
  { name: "World of Warcraft", category: "Gaming", suggestedPrice: "14.99", billingCycle: "Monthly", description: "MMORPG subscription", popularity: "70" },

  // Fitness & Health (10)
  { name: "Peloton All-Access", category: "Fitness", suggestedPrice: "44.00", billingCycle: "Monthly", description: "Fitness classes", popularity: "80" },
  { name: "ClassPass", category: "Fitness", suggestedPrice: "79.00", billingCycle: "Monthly", description: "Fitness class booking", popularity: "72" },
  { name: "Strava Premium", category: "Fitness", suggestedPrice: "11.99", billingCycle: "Monthly", description: "Advanced fitness tracking", popularity: "70" },
  { name: "MyFitnessPal Premium", category: "Fitness", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Nutrition and fitness tracking", popularity: "68" },
  { name: "Headspace", category: "Fitness", suggestedPrice: "12.99", billingCycle: "Monthly", description: "Meditation and mindfulness", popularity: "75" },
  { name: "Calm Premium", category: "Fitness", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Meditation and sleep", popularity: "78" },
  { name: "Noom", category: "Fitness", suggestedPrice: "59.00", billingCycle: "Monthly", description: "Weight loss program", popularity: "65" },
  { name: "Nike Training Club Premium", category: "Fitness", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Workout programs", popularity: "62" },
  { name: "Fitbit Premium", category: "Fitness", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Advanced health insights", popularity: "70" },
  { name: "Whoop", category: "Fitness", suggestedPrice: "30.00", billingCycle: "Monthly", description: "Fitness and recovery tracking", popularity: "60" },

  // News & Media (11)
  { name: "The New York Times", category: "News & Media", suggestedPrice: "25.00", billingCycle: "Monthly", description: "Digital news access", popularity: "85" },
  { name: "The Wall Street Journal", category: "News & Media", suggestedPrice: "38.99", billingCycle: "Monthly", description: "Business news", popularity: "80" },
  { name: "The Washington Post", category: "News & Media", suggestedPrice: "10.00", billingCycle: "Monthly", description: "Digital news access", popularity: "75" },
  { name: "The Athletic", category: "News & Media", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Sports journalism", popularity: "68" },
  { name: "Medium Membership", category: "News & Media", suggestedPrice: "5.00", billingCycle: "Monthly", description: "Access to member-only stories", popularity: "72" },
  { name: "Substack Pro", category: "News & Media", suggestedPrice: "10.00", billingCycle: "Monthly", description: "Newsletter platform", popularity: "65" },
  { name: "The Economist", category: "News & Media", suggestedPrice: "39.00", billingCycle: "Monthly", description: "Global news and analysis", popularity: "70" },
  { name: "Bloomberg News", category: "News & Media", suggestedPrice: "34.99", billingCycle: "Monthly", description: "Business and finance news", popularity: "68" },
  { name: "Financial Times", category: "News & Media", suggestedPrice: "39.00", billingCycle: "Monthly", description: "Business journalism", popularity: "65" },
  { name: "Apple News+", category: "News & Media", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Magazines and newspapers", popularity: "72" },
  { name: "Kindle Unlimited", category: "News & Media", suggestedPrice: "11.99", billingCycle: "Monthly", description: "Unlimited ebook access", popularity: "78" },

  // Other Services (10)
  { name: "Amazon Prime", category: "Other", suggestedPrice: "14.99", billingCycle: "Monthly", description: "Free shipping and Prime Video", popularity: "98" },
  { name: "LinkedIn Premium", category: "Other", suggestedPrice: "29.99", billingCycle: "Monthly", description: "Professional networking", popularity: "70" },
  { name: "Costco Membership", category: "Other", suggestedPrice: "5.00", billingCycle: "Monthly", description: "Warehouse club membership", popularity: "85" },
  { name: "AAA Membership", category: "Other", suggestedPrice: "5.50", billingCycle: "Monthly", description: "Roadside assistance", popularity: "75" },
  { name: "NordVPN", category: "Software", suggestedPrice: "11.99", billingCycle: "Monthly", description: "VPN service", popularity: "80" },
  { name: "ExpressVPN", category: "Software", suggestedPrice: "12.95", billingCycle: "Monthly", description: "VPN service", popularity: "78" },
  { name: "Surfshark VPN", category: "Software", suggestedPrice: "12.95", billingCycle: "Monthly", description: "VPN service", popularity: "72" },
  { name: "Norton 360", category: "Software", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Antivirus and security", popularity: "75" },
  { name: "McAfee Total Protection", category: "Software", suggestedPrice: "9.99", billingCycle: "Monthly", description: "Antivirus software", popularity: "70" },
  { name: "Patreon", category: "Other", suggestedPrice: "10.00", billingCycle: "Monthly", description: "Creator membership", popularity: "65" },
];

export async function seedSubscriptionTemplates() {
  try {
    console.log("🌱 Seeding subscription templates...");
    
    // Check if templates already exist
    const existing = await db.select().from(subscriptionTemplates);
    if (existing.length > 0) {
      console.log(`✓ ${existing.length} templates already exist, skipping seed`);
      return;
    }

    // Insert templates in batches
    const batchSize = 20;
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      await db.insert(subscriptionTemplates).values(batch);
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)}`);
    }

    console.log(`✓ Successfully seeded ${templates.length} subscription templates`);
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
