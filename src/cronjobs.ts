import { Client, TextChannel } from 'discord.js';
import { asyncForEach } from './helperFunctions';
import {
  SaltModel,
  SaltrankModel,
  SettingsModel,
  StillMutedModel,
  UserModel,
  Vote,
  VoteModel,
} from './db';
import { checkGuild } from './dbHelpers';
import config from './configuration';
import { sendException, sendJoinEvent, sendStartupEvent } from './webhooks';
import { removeLocallyStoredJoinsoundsOfGuild } from './commands/joinsounds/fileManagement';

if (!config.dburl) {
  throw new Error('Missing DB connection URL');
}

const allowDeletions = true;

// automatic deletion of reports:
async function hourlyCleanup(bot: Client, isFirst: boolean) {
  const now = new Date();
  console.log('Running hourly cleanup at:', now);
  const h = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
    0,
    0,
    0,
  );
  const timeoutForNextHour = h.getTime() - now.getTime();
  if (isFirst) {
    await sendStartupEvent(bot.shard!.ids[0], true);
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const guilds = bot.guilds.cache;
  let counter = 0;
  await asyncForEach(guilds, async (G) => {
    const guildID = G.id;
    const localCounter = ++counter;
    await checkGuild(guildID);
    // update the guild settings entry so that it does NOT get deleted
    await SettingsModel.updateOne(
      { _id: guildID },
      { $set: { lastConnected: now } },
    );
    const ranking = await SaltrankModel.find({ guild: guildID });
    await asyncForEach(ranking, async (report) => {
      const removeData = await SaltModel.deleteMany({
        date: { $lt: sevenDaysAgo },
        guild: guildID,
        salter: report.salter,
      });
      if (removeData.deletedCount && removeData.deletedCount > 0) {
        const slt = report.salt - removeData.deletedCount;
        if (slt <= 0) {
          await SaltrankModel.deleteOne({
            salter: report.salter,
            guild: guildID,
          });
        } else {
          await SaltrankModel.updateOne(
            {
              salter: report.salter,
              guild: guildID,
            },
            { $set: { salt: slt } },
          );
        }
      }
    });
    // update percentage message
    /* if (msg) {
      const u = process.hrtime(t0);
      if (
        (u[0] - latestTimePassed > 0 && localCounter > lastPostedCounter)
        || localCounter === guilds.length
      ) {
        // eslint-disable-next-line prefer-destructuring
        latestTimePassed = u[0];
        lastPostedCounter = localCounter;
        const percentage = Math.round((localCounter / guilds.length) * 100);
        let uptime = '';
        // mins
        let x = Math.floor(u[0] / 60);
        if (x > 0) {
          uptime += `${x}m : `;
        }
        // secs
        x = u[0] % 60;
        if (x >= 0) {
          uptime += `${x}s`;
        }
        await msg.edit(
          `Shard ${bot.shard!.ids[0]}: ${percentage} % with ${uptime} passed`,
        );
      }
    } */
    if (localCounter >= guilds.size && isFirst) {
      await sendStartupEvent(bot.shard!.ids[0]);
    }
  });

  // find all guilds that have not connected for a week
  const guilds2 = await SettingsModel.find({
    lastConnected: { $lt: sevenDaysAgo },
  });
  // remove all data saved for those guilds
  await asyncForEach(guilds2, async (guild) => {
    // eslint-disable-next-line no-underscore-dangle
    const guildID = guild._id;
    try {
      if (allowDeletions) {
        await sendJoinEvent(
          `:wastebasket: Deleting all information from guild with ID ${guildID} because they removed me more than seven days ago.`,
          bot.shard?.ids[0],
        );
        // ignore salt and saltrank, as they are removed after 7 days anyways
        await StillMutedModel.deleteMany({ guildid: guildID });
        await UserModel.deleteMany({ guildID });
        // doing this per guild instead of with a list of guilds is less efficient
        // but now it happens at the same time as the rest of deletion
        await removeLocallyStoredJoinsoundsOfGuild(guildID);
        await VoteModel.deleteMany({ guildid: guildID });
        await SettingsModel.deleteMany({ _id: guildID });
      } else {
        await sendJoinEvent(
          `:wastebasket: Attempting to delete all information from guild with ID ${guildID} because they removed me more than seven days ago. Deletion is deactivated for now, though.`,
          bot.shard?.ids[0],
        );
      }
    } catch (error) {
      sendException(
        `Failed deleting all information releated to guild with ID ${guildID} : ${error}`,
        bot.shard?.ids[0],
      );
    }
  });

  // call function for next hour
  setTimeout(() => hourlyCleanup(bot, false), timeoutForNextHour);
}

const reactions = [
  '🇦',
  '🇧',
  '🇨',
  '🇩',
  '🇪',
  '🇫',
  '🇬',
  '🇭',
  '🇮',
  '🇯',
  '🇰',
  '🇱',
  '🇲',
  '🇳',
  '🇴',
  '🇵',
  '🇶',
  '🇷',
  '🇸',
  '🇹',
];

// this should take care of everything that needs to be done when a vote ends
async function endVote(vote: Vote, bot: Client) {
  try {
    const voteChannel = (await bot.channels.fetch(
      vote.channelID,
    )) as TextChannel;
    if (voteChannel) {
      const msg = await voteChannel.messages.fetch(vote.messageID);
      if (msg) {
        const reacts = msg.reactions;
        let finalReact: Array<{ reaction: number; count: number }> = [];
        reactions.forEach((x, i) => {
          if (i >= vote.options.length) {
            return;
          }
          const react = reacts.resolve(x);
          if (react && react.count) {
            if (!finalReact[0] || finalReact[0].count <= react.count) {
              if (!finalReact[0] || finalReact[0].count < react.count) {
                finalReact = [
                  {
                    reaction: i,
                    count: react.count,
                  },
                ];
              } else {
                finalReact.push({
                  reaction: i,
                  count: react.count,
                });
              }
            }
          }
        });
        if (finalReact[0]) {
          if (finalReact.length > 1) {
            let str = `**${vote.topic}** ended.\n\nThere was a tie between `;
            if (vote.authorID) {
              str = `**${vote.topic}** by <@${vote.authorID}> ended.\n\nThere was a tie between `;
            }
            finalReact.forEach((react, i) => {
              str += `**${vote.options[react.reaction]}**`;
              if (i < finalReact.length - 2) {
                str += ', ';
              } else if (i === finalReact.length - 2) {
                str += ' and ';
              }
            });
            str += ` with each having ** ${finalReact[0].count - 1} ** votes.`;
            await msg.edit(str);
          } else {
            let str = `**${vote.topic}** ended.\n\nThe result is **${
              vote.options[finalReact[0].reaction]
            }** with **${finalReact[0].count - 1}** votes.`;
            if (vote.authorID) {
              str = `**${vote.topic}** by <@${
                vote.authorID
              }> ended.\n\nThe result is **${
                vote.options[finalReact[0].reaction]
              }** with **${finalReact[0].count - 1}** votes.`;
            }
            await msg.edit(str);
          }
        } else {
          let str = `**${vote.topic}** ended.\n\nCould not compute a result.`;
          if (vote.authorID) {
            str = `**${vote.topic}** by <@${vote.authorID}> ended.\n\nCould not compute a result.`;
          }
          await msg.edit(str);
        }
        await msg.reactions.removeAll();
      }
    }
  } catch (error) {
    console.error(JSON.stringify(error, null, 2));
    if (
      // eslint-disable-next-line eqeqeq
      (error as any).httpStatus != 404 /*  'DiscordAPIError: Unknown Message' */
    ) {
      throw error;
    }
  }
}

async function voteCheck(bot: Client) {
  const d = new Date();
  const h = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds() + 10,
    0,
  );
  const e = h.getTime() - d.getTime();
  if (e > 100) {
    // some arbitrary time period
    setTimeout(voteCheck.bind(null, bot), e);
  }
  // do vote stuff
  const nd = new Date();
  const votes = await VoteModel.find({ date: { $lte: nd } });
  await asyncForEach(votes, async (vote) => {
    try {
      await endVote(vote, bot);
      await vote.delete();
    } catch (err) {
      if (
        (err as any).name === 'DiscordAPIError'
        && (err as any).message === 'Missing Access'
      ) {
        await vote.delete();
      } else {
        throw err;
      }
    }
  });
  // endof vote stuff
}

export function startUp(bot: Client) {
  // repeating functions:
  hourlyCleanup(bot, true);
  voteCheck(bot);
}
