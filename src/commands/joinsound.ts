import { CommandInteraction, MessageAttachment, User } from 'discord.js';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getGlobalUser, getSettings, getUser } from '../dbHelpers';
import { isShadowBanned, PREFIXES, shadowBannedLevel } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { MagibotSlashCommand } from '../types/command';

function printHelp() {
	const info: Array<{ name: string; value: string }> = [];
	info.push({
		name: '(and attach soundfile to this command)',
		value:
      'Set up a joinsound for yourself. Only .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'default (and attach soundfile to this command)',
		value:
      'Set up a default joinsound for yourself. This will play for you on every server MagiBot is on, until you override it with a sound there.\nOnly .mp3 and .wav are being supported at the moment.\nRemember to attach the sound file to the message you use this command in.',
	});
	info.push({
		name: 'rem',
		value: 'Remove your joinsound',
	});
	info.push({
		name: 'rem default',
		value: 'Remove your default joinsound',
	});

	return info;
}

export async function addSound(
	userid: string,
	surl: string | undefined,
	guildID: string,
) {
	const user = await getUser(userid, guildID);
	user.sound = surl;
	await user.save();
	return true;
}

async function addGlobalSound(userId: string, surl: string | undefined) {
	const user = await getGlobalUser(userId);
	user.sound = surl;
	await user.save();
	return true;
}

export async function setDefaultGuildJoinsound(
	guildId: string,
	soundUrl: string | undefined,
) {
	const guild = await getSettings(guildId);
	guild.defaultJoinsound = soundUrl;
	await guild.save();
	return true;
}

export async function validateJoinsound(
	attachment: MessageAttachment,
	interaction: CommandInteraction,
	setDefault: boolean,
	user?: User,
	defaultForGuildId?: string,
) {
	if (setDefault && user) {
		throw new Error('Cant set-default sounds for others!');
	}
	const isAudioFile = attachment.contentType?.startsWith('audio/');
	if (!isAudioFile) {
		interaction.followUp('The file you sent is not an audio file!');
		return;
	}
	const { url } = attachment;
	const sound = await ffprobe(url, { path: ffprobeStatic.path }).catch(
		() => {},
	);
	if (!sound) {
		interaction.followUp('Something went wrong when trying to load your file.');
		return;
	}
	// eslint-disable-next-line prefer-destructuring
	const firstStream = sound.streams[0];
	if (
		firstStream
    && firstStream.codec_name !== 'mp3'
    && firstStream.codec_name !== 'pcm_s16le'
    && firstStream.codec_name !== 'pcm_f32le'
	) {
		interaction.followUp(
			`You need to use a compatible file! For more info use \`${PREFIXES.get(
        interaction.guild!.id,
			)}.help sound\``,
		);
		return;
	}
	if (!firstStream.duration) {
		interaction.followUp(
			"Failed to calculate the duration of the joinsound you're trying to add.",
		);
		return;
	}
	if (firstStream.duration > 8) {
		interaction.followUp(
			"The joinsound you're trying to add is longer than 8 seconds.",
		);
		return;
	}
	const userId = user ? user.id : interaction.member!.user.id;
	if (defaultForGuildId) {
		await setDefaultGuildJoinsound(defaultForGuildId, url);
	} else if (setDefault) {
		await addGlobalSound(userId, url);
	} else {
		await addSound(userId, url, interaction.guild!.id);
	}
	if (defaultForGuildId) {
		interaction.followUp(
			'You successfully changed the default joinsound for this server!',
		);
	} else if (user) {
		interaction.followUp(`You successfully changed ${user}s joinsound!`);
	} else {
		interaction.followUp(
			`You successfully changed your ${setDefault ? 'default ' : ''}joinsound!`,
		);
	}
}

const slashCommand = new SlashCommandBuilder()
	.setName('joinsound')
	.setDescription('Manage your joinsounds.')
	.addSubcommand((subcommand) => subcommand
		.setName('set')
		.setDescription('Set your joinsound.')
		.addAttachmentOption((option) => option
			.setName('sound')
			.setDescription(
				'The sound you want to use. Mp3 or wav, max length of 8 seconds.',
			)
			.setRequired(true)))
	.addSubcommand((subcommand) => subcommand.setName('remove').setDescription('Remove your joinsound.'))
	.addSubcommand((subcommand) => subcommand
		.setName('set-default')
		.setDescription('Set your default joinsound.')
		.addAttachmentOption((option) => option
			.setName('sound')
			.setDescription(
				'The sound you want to use per default in all guilds. Mp3 or wav, max length of 8 seconds.',
			)
			.setRequired(true)))
	.addSubcommand((subcommand) => subcommand
		.setName('remove-default')
		.setDescription('Remove your default joinsound.'));

async function runCommand(interaction: CommandInteraction) {
	const { user } = interaction.member!;
	const guild = interaction.guild!;
	if (
		isShadowBanned(user.id, guild.id, guild.ownerId) !== shadowBannedLevel.not
	) {
		interaction.followUp('You cant do this.');
		return;
	}
	const subcommand = interaction.options.getSubcommand(true) as
    | 'set'
    | 'set-default'
    | 'remove'
    | 'remove-default';

	if (subcommand === 'set') {
		const attachment = interaction.options.getAttachment('sound', true);
		await validateJoinsound(attachment, interaction, false);
	}
	if (subcommand === 'set-default') {
		const attachment = interaction.options.getAttachment('sound', true);
		await validateJoinsound(attachment, interaction, true);
	}
	if (subcommand === 'remove') {
		await addSound(user.id, undefined, guild.id);
		interaction.followUp('Successfully removed your joinsound!');
	}
	if (subcommand === 'remove-default') {
		await addGlobalSound(user.id, undefined);
		interaction.followUp('Successfully removed your default joinsound!');
	}
}
export const joinsound: MagibotSlashCommand = {
	help() {
		return printHelp();
	},
	permissions: 'SEND_MESSAGES',
	category: commandCategories.fun,
	definition: slashCommand.toJSON(),
	run: runCommand,
	isSlow: true,
};
