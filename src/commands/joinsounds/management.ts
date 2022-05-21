import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { CommandInteraction, MessageAttachment, User } from 'discord.js';
import { getGlobalUser, getSettings, getUser } from '../../dbHelpers';
import {
	getJoinsoundReadableStreamOfUser,
	removeJoinsoundOfUser,
	storeJoinsoundOfUser,
} from './fileManagement';

async function setSound(
	userId: string,
	guildId: string,
	soundUrl: string | undefined,
	locallyStored: boolean,
) {
	const user = await getUser(userId, guildId);
	if (!locallyStored) {
		user.sound = soundUrl;
	} else if (soundUrl) {
		user.sound = 'local';
		await storeJoinsoundOfUser({ userId, guildId }, soundUrl);
	} else {
		user.sound = undefined;
		await removeJoinsoundOfUser({ userId, guildId });
	}
	await user.save();
	return true;
}

export async function removeSound(userId: string, guildId: string) {
	return setSound(userId, guildId, undefined, true);
}

async function setDefaultSound(
	userId: string,
	soundUrl: string | undefined,
	locallyStored: boolean,
) {
	const user = await getGlobalUser(userId);

	if (!locallyStored) {
		user.sound = soundUrl;
	} else if (soundUrl) {
		user.sound = 'local';
		await storeJoinsoundOfUser({ userId, default: true }, soundUrl);
	} else {
		user.sound = undefined;
		await removeJoinsoundOfUser({ userId, default: true });
	}

	await user.save();
	return true;
}

export async function removeDefaultSound(userId: string) {
	return setDefaultSound(userId, undefined, true);
}

async function setDefaultGuildJoinsound(
	guildId: string,
	soundUrl: string | undefined,
	locallyStored: boolean,
) {
	const guild = await getSettings(guildId);

	if (!locallyStored) {
		guild.defaultJoinsound = soundUrl;
	} else if (soundUrl) {
		guild.defaultJoinsound = 'local';
		await storeJoinsoundOfUser({ guildId, default: true }, soundUrl);
	} else {
		guild.defaultJoinsound = undefined;
		await removeJoinsoundOfUser({ guildId, default: true });
	}

	await guild.save();
	return true;
}

export async function removeDefaultGuildJoinsound(guildId: string) {
	return setDefaultGuildJoinsound(guildId, undefined, true);
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
	let locallyStored = true;
	if (typeof attachmentOrUrl === 'string') {
		soundUrl = attachmentOrUrl;
		locallyStored = false;
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
		await setDefaultGuildJoinsound(defaultForGuildId, soundUrl, locallyStored);
	} else if (setDefault) {
		await setDefaultSound(userId, soundUrl, locallyStored);
	} else {
		await setSound(userId, interaction.guild!.id, soundUrl, locallyStored);
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

export async function getJoinsoundOfUser(userId: string, guildId: string) {
	const user = await getUser(userId, guildId);
	if (user.sound && user.sound !== 'false') {
		if (user.sound === 'local') {
			return getJoinsoundReadableStreamOfUser({ userId, guildId });
		}
		return user.sound;
	}
	const defaultUser = await getGlobalUser(userId);
	if (defaultUser.sound && defaultUser.sound !== 'false') {
		if (defaultUser.sound === 'local') {
			return getJoinsoundReadableStreamOfUser({ userId, default: true });
		}
		return defaultUser.sound;
	}
	const defaultGuildSound = await getSettings(guildId);
	if (
		defaultGuildSound.defaultJoinsound
    && defaultGuildSound.defaultJoinsound !== 'false'
	) {
		if (defaultGuildSound.defaultJoinsound === 'local') {
			return getJoinsoundReadableStreamOfUser({ guildId, default: true });
		}
		return defaultGuildSound.defaultJoinsound;
	}
	return null;
}
