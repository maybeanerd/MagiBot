import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { CommandInteraction, MessageAttachment, User } from 'discord.js';
import { getGlobalUser, getSettings, getUser } from '../../dbHelpers';
import { removeJoinsoundOfUser, storeJoinsoundOfUser } from './fileManagement';

async function setSound(
	userId: string,
	guildId: string,
	soundUrl: string | undefined,
) {
	const user = await getUser(userId, guildId);
	user.sound = soundUrl;
	if (soundUrl) {
		await storeJoinsoundOfUser({ userId, guildId, default: false }, soundUrl);
	} else {
		await removeJoinsoundOfUser({ userId, guildId, default: false });
	}
	await user.save();
	return true;
}

export async function removeSound(userId: string, guildId: string) {
	return setSound(userId, guildId, undefined);
}

async function setDefaultSound(userId: string, soundUrl: string | undefined) {
	const user = await getGlobalUser(userId);
	user.sound = soundUrl;
	await user.save();
	if (soundUrl) {
		await storeJoinsoundOfUser({ userId, default: true }, soundUrl);
	} else {
		await removeJoinsoundOfUser({ userId, default: true });
	}
	return true;
}
export async function removeDefaultSound(userId: string) {
	return setDefaultSound(userId, undefined);
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

export async function validateAndSaveJoinsound(
	attachmentOrUrl: MessageAttachment | string,
	interaction: CommandInteraction,
	setDefault: boolean,
	user?: User,
	defaultForGuildId?: string,
) {
	if (setDefault && user) {
		throw new Error('Cant set-default sounds for others!');
	}

	let soundUrl: string;
	if (typeof attachmentOrUrl === 'string') {
		soundUrl = attachmentOrUrl;
	} else {
		const isAudioFile = attachmentOrUrl.contentType?.startsWith('audio/');
		if (!isAudioFile) {
			interaction.followUp('The file you sent is not an audio file!');
			return;
		}
		soundUrl = attachmentOrUrl.url;
	}

	const sound = await ffprobe(soundUrl, { path: ffprobeStatic.path }).catch(
		() => {},
	);
	if (!sound) {
		interaction.followUp(
			'Something went wrong when trying to load your file. Make sure the URL links directly to an audio file.',
		);
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
			'You need to use a compatible file! For more info use `help sound`',
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
		await setDefaultGuildJoinsound(defaultForGuildId, soundUrl);
	} else if (setDefault) {
		await setDefaultSound(userId, soundUrl);
	} else {
		await setSound(userId, interaction.guild!.id, soundUrl);
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
