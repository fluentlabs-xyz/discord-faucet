import type { Command } from './index.js';
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	EmbedBuilder,
	MessageFlags,
	TimestampStyles,
	time,
} from 'discord.js';
import { canClaim, submitClaim, getClaimStatus } from '../services/quicknode.js';
import { getLastByUserInWindow, recordSuccess } from '../services/store.js';

const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_SECONDS ?? 86_400); // 24h
const EXPLORER_TX_URL = process.env.EXPLORER_TX_URL; // e.g. https://testnet.fluentscan.xyz/tx/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-3)}`;

export default {
	data: {
		type: ApplicationCommandType.ChatInput,
		name: 'claim',
		description: 'Request test ETH to an address',
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: 'address',
				description: 'EVM address (0x...)',
				required: true,
			},
		],
	},

	async execute(interaction) {
		const address = interaction.options.getString('address', true);

		// Minimal EVM address validation
		if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
			await interaction.reply({ content: '❌ Invalid EVM address.', flags: MessageFlags.Ephemeral });
			return;
		}

		// Acknowledge within 3s
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		// Local cooldown check: only successful claims are stored
		const recent = getLastByUserInWindow(interaction.user.id, COOLDOWN_SECONDS);
		if (recent) {
			const next = new Date((recent.created_at + COOLDOWN_SECONDS) * 1000);
			await interaction.editReply(`❌ Cooldown. Next available: ${next.toUTCString()}`);
			return;
		}

		try {
			// Remote preflight
			const pre = await canClaim(address, interaction.user.id);
			if (!pre?.success || !pre.data?.canClaim) {
				await interaction.editReply('❌ Cooldown/limit. Try again later.');
				return;
			}

			// Submit claim
			const created = await submitClaim(address, interaction.user.id);
			const txId = created?.transactionId;
			if (!txId) {
				await interaction.editReply('⚠️ Service issue. Please try again later.');
				return;
			}

			// Short poll for a real tx hash (best effort)
			let txHash: string | undefined;
			const deadline = Date.now() + 8_000;
			while (Date.now() < deadline) {
				await sleep(400);
				const st = await getClaimStatus(txId);
				const h = st?.data?.transactionHash || undefined;
				if (h) {
					txHash = h;
					// Persist successful claim
					recordSuccess({
						discord_user_id: interaction.user.id,
						guild_id: interaction.guildId ?? undefined,
						channel_id: interaction.channelId,
						address,
						transaction_id: txId,
						tx_hash: h,
						amount_wei: pre.data?.amountInWei,
					});
					break;
				}
				if (st?.success === false) break;
			}

			const amount = pre.data?.amount ?? 1;
			const next = new Date(Date.now() + COOLDOWN_SECONDS * 1000);

			const embed = new EmbedBuilder()
				.setTitle(txHash ? '✅ Transaction Sent!' : '✅ Claim Submitted (processing)')
				.setDescription(
					[
						`**Amount:** ${amount} ETH`,
						`**To:** \`${shortAddr(address)}\``,
						txHash
							? EXPLORER_TX_URL
								? `**Tx:** ${EXPLORER_TX_URL}${txHash}`
								: `**Tx:** ${txHash}`
							: `**Tx:** processing…`,
						'',
						`**Next request available:** ${time(Math.floor(next.getTime() / 1000), TimestampStyles.LongDateTime)}`,
					].join('\n'),
				);

			await interaction.editReply({ content: '⏳ Processing your request...', embeds: [embed] });
		} catch (e) {
			console.error('claim error:', e);
			await interaction.editReply('⚠️ Service issue. Please try again later.');
		}
	},
} satisfies Command;
