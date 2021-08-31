import Discord, {
	Client, DiscordAPIError, Guild, Intents,
} from 'discord.js';
import { handle } from 'blapi';
import {
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
	generateDependencyReport,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import config from './configuration';
import {
	PREFIX,
	PREFIXES,
	TOKEN,
	queueVoiceChannels,
	setUser,
	resetPrefixes,
	shadowBannedSound,
	isShadowBanned,
	shadowBannedLevel,
} from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { checkCommand } from './commandHandler';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { saveJoinsoundsPlayedOfShard } from './statTracking';
import {
	checkGuild,
	getPrefix,
	isBlacklistedUser,
	getUser,
	toggleStillMuted,
	isJoinableVc,
} from './dbHelpers';
import { StillMutedModel } from './db';
import {
	asyncForEach /* , doNothingOnError, returnNullOnError */,
} from './bamands';
import { startUp } from './cronjobs';
import { sendJoinEvent } from './webhooks';

console.log(generateDependencyReport());

async function initializePrefixes(bot: Client) {
	resetPrefixes();
	const guilds = bot.guilds.cache;
	asyncForEach(guilds, async (G) => {
		PREFIXES.set(G.id, await getPrefix(G.id));
	});
}

async function isStillMuted(userID: string, guildID: string) {
	const find = await StillMutedModel.findOne({
		userid: userID,
		guildid: guildID,
	});
	return Boolean(find);
}

const intents = [
	Intents.FLAGS.GUILDS,
	// Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
	Intents.FLAGS.GUILD_INTEGRATIONS,
	/* | 'GUILD_WEBHOOKS'
  | 'GUILD_INVITES' */
	Intents.FLAGS.GUILD_VOICE_STATES,
	// | 'GUILD_PRESENCES'
	Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	// | 'GUILD_MESSAGE_TYPING'
	Intents.FLAGS.DIRECT_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
	// | 'DIRECT_MESSAGE_TYPING';
];

export const bot = new Client({ intents });
// post to the APIs every 30 minutes
if (config.blapis) {
	handle(bot, config.blapis, 30);
}
process.on('uncaughtException', async (err) => {
	console.error(`Uncaught Exception:\n${err.stack ? err.stack : err}`);
	await catchErrorOnDiscord(
		`**Uncaught Exception:**\n\`\`\`${err.stack ? err.stack : err}\`\`\``,
	);
});
process.on(
	'unhandledRejection',
	async (err: any /* to fix weird type issues */) => {
		console.error(`Unhandled promise rejection:\n${err}`);
		if (err) {
			if (err instanceof DiscordAPIError) {
				await catchErrorOnDiscord(
					`**DiscordAPIError (${err.method || 'NONE'}):**\n\`\`\`${
						err.message
					}\`\`\`\`\`\`${err.path ? err.path.substring(0, 1200) : ''}\`\`\``,
				);
			} else {
				await catchErrorOnDiscord(
					`**Outer Unhandled promise rejection:**\n\`\`\`${err}\`\`\`\`\`\`${
						err.stack ? err.stack.substring(0, 1200) : ''
					}\`\`\``,
				);
			}
		}
	},
);

// fires on startup and on reconnect
let justStartedUp = true;
bot.on('ready', async () => {
	if (!bot.user) {
		throw new Error('FATAL Bot has no user.');
	}
	setUser(bot.user); // give user ID to other code
	if (justStartedUp) {
		startUp(bot);
		justStartedUp = false;
	}
	bot.user.setPresence({
		activities: [
			{
				name: `${PREFIX}.help`,
				type: 'WATCHING',
				url: 'https://bots.ondiscord.xyz/bots/384820232583249921',
			},
		],
		status: 'online',
	});
	initializePrefixes(bot);
});

bot.on('message', async (msg) => {
	try {
		await checkCommand(msg as Discord.Message);
	} catch (err) {
		console.error(err);
	}
});

async function guildPrefixStartup(guild: Guild) {
	try {
		await checkGuild(guild.id);
		PREFIXES.set(guild.id, await getPrefix(guild.id));
	} catch (err) {
		console.error(err);
	}
}

bot.on('guildCreate', async (guild) => {
	if (guild.available) {
		await guildPrefixStartup(guild);
		const owner = await guild.fetchOwner();
		if (owner) {
			owner
				.send(
					`Hi there ${owner.displayName}.\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use \`${PREFIX}:help setup\`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands (\`${PREFIX}:setup admin @role\`)\n\t- add some text channels where users can use the bot (\`${PREFIX}:setup command\`)\n\t- add voice channels in which the bot is allowed to `
            + `join to use joinsounds (\`${PREFIX}:setup join\`)\n\t- add a notification channel where bot updates and information will be posted (\`${PREFIX}:setup notification\`)\n\nTo make sure the bot can use all its functions consider giving it a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev`,
				)
				.catch(() => {});
		}
		await sendJoinEvent(
			`:white_check_mark: joined **${guild.name}**: "${guild.description}" (${guild.memberCount} users, ID: ${guild.id})\nOwner is: <@${guild.ownerId}> (ID: ${guild.ownerId})`,
		);
	}
});

bot.on('guildDelete', async (guild) => {
	if (guild.available) {
		await sendJoinEvent(
			`:x: left ${guild.name} (${guild.memberCount} users, ID: ${guild.id})`,
		);
	}
});

bot.on('error', (err) => {
	console.error(err);
});

bot.on('voiceStateUpdate', async (o, n) => {
	try {
		const newVc = n.channel;
		// check if voice channel actually changed, don't mute bots
		if (
			n.member
      && !n.member.user.bot
      && (!o.channel || !newVc || o.channel.id !== newVc.id)
		) {
			// is muted and joined a vc? maybe still muted from queue
			if (n.serverMute && (await isStillMuted(n.id, n.guild.id))) {
				n.setMute(
					false,
					'was still muted from a queue which user disconnected from',
				);
				toggleStillMuted(n.id, n.guild.id, false);
			} else if (
				!n.serverMute
        && newVc
        && queueVoiceChannels.has(n.guild.id)
        && queueVoiceChannels.get(n.guild.id) === newVc.id
			) {
				// user joined a muted channel
				n.setMute(true, 'joined active queue voice channel');
			} else if (
				o.serverMute
        && o.channel
        && queueVoiceChannels.has(o.guild.id)
        && queueVoiceChannels.get(o.guild.id) === o.channel.id
			) {
				// user left a muted channel
				if (newVc) {
					n.setMute(false, 'left active queue voice channel');
				} else {
					// save the unmute for later
					toggleStillMuted(n.id, n.guild.id, true);
				}
			}
			// TODO remove/rework mute logic before this comment
			const shadowBanned = isShadowBanned(
				n.member.id,
				n.guild.id,
				n.guild.ownerId,
			);
			if (
				newVc
        && n.guild.me
        && !n.guild.me.voice.channel
        && n.id !== bot.user!.id
        && newVc.joinable // checks vc size
        && !(await isBlacklistedUser(n.id, n.guild.id))
        && ((await isJoinableVc(n.guild.id, newVc.id)) // checks magibot settings
          || shadowBanned === shadowBannedLevel.guild)
			) {
				const perms = newVc.permissionsFor(n.guild.me);
				if (perms && perms.has('CONNECT')) {
					const user = await getUser(n.id, n.guild.id);
					let { sound } = user;
					if (shadowBanned !== shadowBannedLevel.not) {
						sound = shadowBannedSound;
					}
					if (sound) {
						const connection = joinVoiceChannel({
							channelId: newVc.id,
							guildId: newVc.guild.id,
							adapterCreator: newVc.guild.voiceAdapterCreator,
						});
						const player = createAudioPlayer();
						connection.subscribe(player);
						const resource = createAudioResource(sound, { inlineVolume: true });
						/* console.log('audio resource:');
						console.log(resource); */
						player.play(resource);
            resource.volume!.setVolume(0.5);
            saveJoinsoundsPlayedOfShard(bot.shard!.ids[0]);
            const timeoutID = setTimeout(() => {
            	connection.disconnect();
            	player.removeAllListeners(); // To be sure noone listens to this anymore
            	player.stop();
            }, 8 * 1000);
            // this does not get triggered once the sound has finished.
            player.on('stateChange', (state) => {
            	console.log('player state:', state);
            	if (state.status === AudioPlayerStatus.Playing) {
            		if (state.playbackDuration > 0) {
            			// disconnect after time the sound needs to play
            			setTimeout(() => {
            				clearTimeout(timeoutID);
            				connection.disconnect();
            				player.removeAllListeners(); // To be sure noone listens to this anymore
            				player.stop();
            			}, state.playbackDuration);
            		}
            	}
            });
            player.on('error', (err) => {
            	clearTimeout(timeoutID);
            	connection.disconnect();
            	player.removeAllListeners(); // To be sure noone listens to this anymore
            	player.stop();
            	catchErrorOnDiscord(
            		`**Dispatcher Error (${
            			(err.toString && err.toString()) || 'NONE'
            		}):**\n\`\`\`
                ${err.stack || 'NO STACK'}
                \`\`\``,
            	);
            });
					}
				}
			}
		}
	} catch (err) {
		console.error(err);
	}
});

bot.on('disconnect', () => {
	console.log('Disconnected!');
});

bot.login(TOKEN); // connect to discord
