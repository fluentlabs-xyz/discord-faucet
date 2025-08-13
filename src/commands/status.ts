import type { Command } from './index.js';
import { ApplicationCommandType, EmbedBuilder, MessageFlags, TimestampStyles, time } from 'discord.js';
import { getLastByUserInWindow } from '../services/store.js';

const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_SECONDS ?? 86_400);
const EXPLORER_TX_URL = process.env.EXPLORER_TX_URL;

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-3)}`;
function formatWei(wei?: string | null): string {
	if (!wei || !/^\d+$/.test(wei)) return '—';
	const s = wei.padStart(19, '0');
	const whole = s.slice(0, -18).replace(/^0+/, '') || '0';
	const frac = s.slice(-18).replace(/0+$/, '');
	return frac ? `${whole}.${frac} ETH` : `${whole} ETH`;
}

export default {
	data: {
		type: ApplicationCommandType.ChatInput,
		name: 'status',
		description: 'Show your last successful claim and cooldown',
	},

	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const last = getLastByUserInWindow(interaction.user.id, COOLDOWN_SECONDS);

		if (!last) {
			await interaction.editReply('✅ Eligible now. No successful claims in the last 24h.');
			return;
		}

		const next = new Date((last.created_at + COOLDOWN_SECONDS) * 1000);

		const lines = [
			`**Amount:** ${formatWei(last.amount_wei)}`,
			`**To:** \`${short(last.address)}\``,
			last.tx_hash
				? EXPLORER_TX_URL
					? `**Tx:** ${EXPLORER_TX_URL}${last.tx_hash}`
					: `**Tx:** ${last.tx_hash}`
				: '**Tx:** —',
			'',
			`**Next request available:** ${time(Math.floor(next.getTime() / 1000), TimestampStyles.LongDateTime)}`,
		];

		const embed = new EmbedBuilder().setTitle('Last successful claim').setDescription(lines.join('\n'));

		await interaction.editReply({ embeds: [embed] });
	},
} satisfies Command;
