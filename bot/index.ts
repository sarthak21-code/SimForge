import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import "dotenv/config";

const token = process.env.DISCORD_BOT_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const API_URL = process.env.API_URL || "http://localhost:3000";

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env.local");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName("simforge")
    .setDescription("Generate an interactive simulation from a question")
    .addStringOption((o) =>
      o
        .setName("query")
        .setDescription("What do you want to explore?")
        .setRequired(true)
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered.");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "simforge") return;

  await interaction.deferReply();
  const query = interaction.options.getString("query", true);

  try {
    const res = await fetch(`${API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const sim = await res.json();
    const url = `${API_URL}/sim/${sim.id || "current"}`;

    await interaction.editReply({
      embeds: [
        {
          title: sim.title,
          description: sim.description,
          url,
          color: 0x3b82f6,
          footer: { text: `Domain: ${sim.domain} • ${url}` },
        },
      ],
    });
  } catch (err) {
    console.error("Bot generation failed:", err);
    await interaction.editReply(
      "Generation failed. Make sure the Next.js server is running on " + API_URL
    );
  }
});

client.login(token);