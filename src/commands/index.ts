import type { ChatInputCommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { z } from 'zod';
import type { StructurePredicate } from '../util/loaders.js';

/**
 * Defines the structure of a command.
 */
export type Command = {
	/** Slash command payload to register with Discord */
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	/** Command handler for chat input interactions */
	execute(interaction: ChatInputCommandInteraction): Promise<void> | void;
};

/**
 * Runtime schema guard for Command.
 * (Keep loose to allow any valid command JSON payload.)
 */
export const schema = z.object({
	data: z.record(z.any()),
	execute: z.function(),
});

/** Type predicate used by dynamic loaders */
export const predicate: StructurePredicate<Command> = (structure: unknown): structure is Command =>
	schema.safeParse(structure).success;
