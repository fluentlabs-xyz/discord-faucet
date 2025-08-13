// src/events/interactionCreate.ts
import { URL } from 'node:url';
import { Events, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { loadCommands } from '../util/loaders.js';
import type { Event } from './index.js';

const commands = await loadCommands(new URL('../commands/', import.meta.url));

const ALLOWED_GUILD_ID = process.env.GUILD_ID!;
const FAUCET_CHANNEL_ID = process.env.FAUCET_CHANNEL_ID!;

const BUILDER_ROLE_ID = process.env.BUILDER_ROLE_ID; // optional

if (!ALLOWED_GUILD_ID) {
	throw new Error('ALLOWED_GUILD_ID is required (set it in your environment).');
}

if (!FAUCET_CHANNEL_ID) {
	throw new Error('FAUCET_CHANNEL_ID is required (set it in your environment).');
}

function memberHasRole(interaction: ChatInputCommandInteraction, roleId: string): boolean {
	const m = interaction.member;
	if (!m) return false;

	// Case 1: GuildMember (has RoleManager with cache)
	if ('roles' in m && (m as GuildMember).roles?.cache) {
		return (m as GuildMember).roles.cache.has(roleId);
	}
	// Case 2: APIInteractionGuildMember (roles is string[] of role IDs)
	const roles = (m as any).roles;
	return Array.isArray(roles) && roles.includes(roleId);
}

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		// Guild guard
		if (!interaction.inGuild() || interaction.guildId !== ALLOWED_GUILD_ID) {
			await interaction.reply({ content: 'This command is only available on the official server.', ephemeral: true });
			return;
		}

		if (interaction.channelId !== FAUCET_CHANNEL_ID) {
			await interaction.reply({
				content: `Please use <#${FAUCET_CHANNEL_ID}> for this command.`,
				ephemeral: true,
			});
			return;
		}

		// Optional role guard
		if (BUILDER_ROLE_ID && !memberHasRole(interaction, BUILDER_ROLE_ID)) {
			await interaction.reply({
				content: `You need the <@&${BUILDER_ROLE_ID}> role to use this command.`,
				ephemeral: true,
			});
			return;
		}

		// Route to command
		const command = commands.get(interaction.commandName);
		if (!command) {
			await interaction.reply({ content: 'Unknown command.', ephemeral: true });
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing /${interaction.commandName}:`, error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({ content: '⚠️ Unexpected error. Please try again later.' });
			} else {
				await interaction.reply({ content: '⚠️ Unexpected error. Please try again later.', ephemeral: true });
			}
		}
	},
} satisfies Event<Events.InteractionCreate>;
