import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
	DiscordGatewayAdapterCreator,
	joinVoiceChannel,
	VoiceConnection,
} from '@discordjs/voice';
import { VoiceState } from 'discord.js';
import { getJoinsoundOfUser } from './commands/joinsounds/management';
import { StillMutedModel } from './db';
import { isBlacklistedUser, isJoinableVc, toggleStillMuted } from './dbHelpers';
import { catchErrorOnDiscord } from './sendToMyDiscord';
import {
	isShadowBanned,
	queueVoiceChannels,
	shadowBannedLevel,
	shadowBannedSound,
} from './shared_assets';
import { saveJoinsoundsPlayedOfShard } from './statTracking';

async function isStillMuted(userID: string, guildID: string) {
	const find = await StillMutedModel.findOne({
		userid: userID,
		guildid: guildID,
	});
	return Boolean(find);
}

function clearConnectionAndPlayer(
	connection: VoiceConnection,
	player: AudioPlayer,
	// eslint-disable-next-line no-undef
	timeoutId?: NodeJS.Timeout,
) {
	if (timeoutId) {
		clearTimeout(timeoutId);
	}
	player.removeAllListeners(); // To be sure noone listens to this anymore
	player.stop();
	connection.destroy();
}

export async function onVoiceStateChange(
	oldState: VoiceState,
	newState: VoiceState,
) {
	let connection: VoiceConnection;
	let player: AudioPlayer;
	const newVc = newState.channel;
	// check if voice channel actually changed, don't mute bots
	if (
		newState.member
    && !newState.member.user.bot
    && (!oldState.channel || !newVc || oldState.channel.id !== newVc.id)
	) {
		// is muted and joined a vc? maybe still muted from queue
		if (
			newState.serverMute
      && (await isStillMuted(newState.id, newState.guild.id))
		) {
			newState.setMute(
				false,
				'was still muted from a queue which user disconnected from',
			);
			toggleStillMuted(newState.id, newState.guild.id, false);
		} else if (
			!newState.serverMute
      && newVc
      && queueVoiceChannels.has(newState.guild.id)
      && queueVoiceChannels.get(newState.guild.id) === newVc.id
		) {
			// user joined a muted channel
			newState.setMute(true, 'joined active queue voice channel');
		} else if (
			oldState.serverMute
      && oldState.channel
      && queueVoiceChannels.has(oldState.guild.id)
      && queueVoiceChannels.get(oldState.guild.id) === oldState.channel.id
		) {
			// user left a muted channel
			if (newVc) {
				newState.setMute(false, 'left active queue voice channel');
			} else {
				// save the unmute for later
				toggleStillMuted(newState.id, newState.guild.id, true);
			}
		}
		// TODO remove/rework mute logic before this comment
		const shadowBanned = isShadowBanned(
			newState.member.id,
			newState.guild.id,
			newState.guild.ownerId,
		);
		if (
			newVc
      && newState.guild.me
      && !newState.guild.me.voice.channel
      && newState.id !== newState.guild.me.user.id
      && newVc.joinable // checks vc size
      && !(await isBlacklistedUser(newState.id, newState.guild.id))
      && ((await isJoinableVc(newState.guild.id, newVc.id)) // checks magibot settings
        || shadowBanned === shadowBannedLevel.guild)
		) {
			const perms = newVc.permissionsFor(newState.guild.me);
			if (perms && perms.has('CONNECT')) {
				let sound = await getJoinsoundOfUser(newState.id, newState.guild.id);
				if (shadowBanned !== shadowBannedLevel.not) {
					sound = shadowBannedSound;
				}
				if (sound) {
					connection = joinVoiceChannel({
						channelId: newVc.id,
						guildId: newVc.guild.id,
						adapterCreator: newVc.guild
							.voiceAdapterCreator as DiscordGatewayAdapterCreator,
					});
					player = createAudioPlayer();
					try {
						connection.subscribe(player);
						const resource = createAudioResource(sound, {
							inlineVolume: true,
						});
						player.play(resource);
            resource.volume!.setVolume(0.5);
            saveJoinsoundsPlayedOfShard(-1); // no shard data here atm

            // 8 seconds is max play time:
            // so when something goes wrong this will time out latest 4 seconds after;
            // this also gives the bot 4 seconds to connect and start playing when it actually works
            /* eslint-disable no-mixed-spaces-and-tabs */
            const timeoutID = setTimeout(() => {
            	clearConnectionAndPlayer(connection, player);
            }, 12 * 1000);
            player.on('stateChange', (state) => {
            	if (state.status === AudioPlayerStatus.Playing) {
            		if (state.playbackDuration > 0) {
            			// this occurs *after* the sound has finished
            			clearConnectionAndPlayer(connection, player, timeoutID);
            		}
            	}
            });
            player.on('error', (err) => {
            	clearConnectionAndPlayer(connection, player, timeoutID);
            	catchErrorOnDiscord(
            		`**Dispatcher Error (${
            			(err.toString && err.toString()) || 'NONE'
            		}):**\n\`\`\`
                ${err.stack || 'NO STACK'}
                \`\`\``,
            	);
            	/* eslint-enable no-mixed-spaces-and-tabs */
            });
					} catch (err) {
						console.error(err);
						clearConnectionAndPlayer(connection, player);
					}
				}
			}
		}
	}
}
