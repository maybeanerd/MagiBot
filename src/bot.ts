import Discord, { Client, DiscordAPIError, Guild } from 'discord.js';
import { handle } from 'blapi';
import config from './configuration';
import {
	PREFIX,
	PREFIXES,
	TOKEN,
	queueVoiceChannels,
	setUser,
	resetPrefixes,
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
import { asyncForEach, doNothingOnError, returnNullOnError } from './bamands';
import { startUp } from './cronjobs';
import { sendJoinEvent } from './webhooks';

async function initializePrefixes(bot: Client) {
	resetPrefixes();
	const guilds = bot.guilds.cache.array();
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

export const bot = new Discord.Client();

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
	await bot.user.setPresence({
		activity: {
			name: `${PREFIX}.help`,
			type: 'WATCHING',
			url: 'https://bots.ondiscord.xyz/bots/384820232583249921',
		},
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
		if (guild.owner) {
			guild.owner
				.send(
					`Hi there ${guild.owner.displayName}.\nThanks for adding me to your server! If you have any need for help or want to help develop the bot by reporting bugs and requesting features, just join https://discord.gg/2Evcf4T\n\nTo setup the bot, use \`${PREFIX}:help setup\`.\nYou should:\n\t- setup an admin role, as only you and users with administrative permission are able to use admin commands (\`${PREFIX}:setup admin @role\`)\n\t- add some text channels where users can use the bot (\`${PREFIX}:setup command\`)\n\t- add voice channels in which the bot is allowed to `
            + `join to use joinsounds (\`${PREFIX}:setup join\`)\n\t- add a notification channel where bot updates and information will be posted (\`${PREFIX}:setup notification\`)\n\nTo make sure the bot can use all its functions consider giving it a role with administrative rights, if you have not done so yet in the invitation.\n\nThanks for being part of this project,\nBasti aka. the MagiBot Dev`,
				)
				.catch(() => {});
		}
		await sendJoinEvent(
			`:white_check_mark: joined **${guild.name}** from ${guild.region} (${guild.memberCount} users, ID: ${guild.id})\nOwner is: <@${guild.ownerID}> (ID: ${guild.ownerID})`,
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
			if (
				newVc
        && n.guild.me
        && !n.guild.me.voice.channel
        && n.id !== bot.user!.id
        && !(await isBlacklistedUser(n.id, n.guild.id))
        && (await isJoinableVc(n.guild.id, newVc.id))
			) {
				const perms = newVc.permissionsFor(n.guild.me);
				if (perms && perms.has('CONNECT')) {
					const user = await getUser(n.id, n.guild.id);
					const { sound } = user;
					if (sound) {
						const connection = await newVc.join();
						const dispatcher = connection.play(sound, {
							seek: 0,
							volume: 0.5,
							bitrate: 'auto',
						});
						saveJoinsoundsPlayedOfShard(bot.shard!.ids[0]);
						// disconnect after 10 seconds if for some reason we don't get the events
						const timeoutID = setTimeout(() => {
							try {
								connection.disconnect();
							} catch (err) {
								catchErrorOnDiscord(
									`**Error in timeout (${
										(err.toString && err.toString()) || 'NONE'
									}):**\n\`\`\`
                ${err.stack || 'NO STACK'}
                \`\`\``,
								);
							}
							dispatcher.removeAllListeners(); // To be sure noone listens to this anymore
						}, 10 * 1000);
						dispatcher.once('finish', () => {
							clearTimeout(timeoutID);
							try {
								connection.disconnect();
							} catch (err) {
								catchErrorOnDiscord(
									`**Error in once finish (${
										(err.toString && err.toString()) || 'NONE'
									}):**\n\`\`\`
                ${err.stack || 'NO STACK'}
                \`\`\``,
								);
							}
							dispatcher.removeAllListeners(); // To be sure noone listens to this anymore
						});
						dispatcher.on('error', (err) => {
							clearTimeout(timeoutID);
							dispatcher.removeAllListeners(); // To be sure noone listens to this anymore
							catchErrorOnDiscord(
								`**Dispatcher Error (${
									(err.toString && err.toString()) || 'NONE'
								}):**\n\`\`\`
                ${err.stack || 'NO STACK'}
                \`\`\``,
							).then(() => connection.disconnect());
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
