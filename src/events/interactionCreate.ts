import { URL } from 'node:url';
import { Events } from 'discord.js';
import { loadCommands } from '../util/loaders.js';
import type { Event } from './index.js';

// Preload all command handlers from /commands
const commands = await loadCommands(new URL('../commands/', import.meta.url));

// Configure access via env
const ALLOWED_GUILD_ID = process.env.GUILD_ID!;
const BUILDER_ROLE_ID = process.env.BUILDER_ROLE_ID; // optional

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Only handle slash (chat input) commands
		if (!interaction.isChatInputCommand()) return;

		// Enforce: must be invoked inside the allowed guild
		if (!interaction.inGuild() || interaction.guildId !== ALLOWED_GUILD_ID) {
			await interaction.reply({ content: 'This command is only available on the official server.', ephemeral: true });
			return;
		}
		const guild = interaction.guild!;

		// Optional: restrict by role (if provided)
		if (BUILDER_ROLE_ID) {
			const member = await guild.members.fetch(interaction.user.id);
			if (!member.roles.cache.has(BUILDER_ROLE_ID)) {
				await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
				return;
			}
		}

		// Route to concrete command handler
		const command = commands.get(interaction.commandName);
		if (!command) {
			await interaction.reply({ content: 'Unknown command.', ephemeral: true });
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			// Centralized error handling for all commands
			console.error(`Error executing /${interaction.commandName}:`, error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({ content: '⚠️ Unexpected error. Please try again later.' });
			} else {
				await interaction.reply({ content: '⚠️ Unexpected error. Please try again later.', ephemeral: true });
			}
		}
	},
} satisfies Event<Events.InteractionCreate>;
