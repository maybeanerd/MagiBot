import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { CommandInteraction, MessageAttachment, User } from 'discord.js';
import { getGlobalUser, getSettings, getUser } from '../../dbHelpers';

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

export async function addGlobalSound(userId: string, surl: string | undefined) {
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

	let soundUrl:string;
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
		interaction.followUp('Something went wrong when trying to load your file. Make sure the URL links directly to an audio file.');
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

	// TODO download attachment?

	if (defaultForGuildId) {
		await setDefaultGuildJoinsound(defaultForGuildId, soundUrl);
	} else if (setDefault) {
		await addGlobalSound(userId, soundUrl);
	} else {
		await addSound(userId, soundUrl, interaction.guild!.id);
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
