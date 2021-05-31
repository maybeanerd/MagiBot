import { TextChannel, VoiceChannel, User } from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from '../bot';
import { yesOrNo } from '../bamands';
import { user, queueVoiceChannels } from '../shared_assets';
import { commandCategories } from '../types/enums';
import { userJoinedQueue } from '../statTracking';
import { magibotCommand } from '../types/magibot';
import { isAdmin, toggleStillMuted } from '../db';

const used: { [k: string]: { date: Date; msg: string; cid: string } } = {};

function messageEdit(
  voiceChannel: VoiceChannel | null | undefined,
  activeUser: User | undefined,
  qU: Array<User>,
  topic: string,
) {
  let msg = `Queue: **${topic}**`;
  if (voiceChannel) {
    msg += `\n*with voicemode activated in* ${voiceChannel}`;
  }
  let tmpms = '\n';
  if (qU.length > 0) {
    for (let i = 0; i < 10 && i < qU.length; i++) {
      tmpms += `- ${qU[i]}\n`;
    }
  } else {
    tmpms = ' no more queued users\n';
  }
  msg += `\n*${qU.length} queued users left*\n\nCurrent user: **${activeUser}**\n\nNext up are:${tmpms}\nUse ☑ to join and ❌ to leave the queue!`;
  return msg;
}

export const queue: magibotCommand = {
  hide: false,
  name: 'queue',
  async main(content, msg) {
    if (!msg.guild) {
      return;
    }
    let voiceChannel: VoiceChannel | null | undefined;
    if (used[msg.guild.id]) {
      const d = new Date();
      if (d.getTime() - used[msg.guild.id].date.getTime() <= 0) {
        // check if its already 2hours old
        if (used[msg.guild.id].msg && used[msg.guild.id].cid) {
          const testchann = msg.guild.channels.cache.get(
            used[msg.guild.id].cid,
          );
          if (
            testchann
            && (await (testchann as TextChannel).messages
              .fetch(used[msg.guild.id].msg)
              .catch(() => {}))
          ) {
            msg.channel.send(
              "There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.",
            );
            return;
          }
        } else {
          msg.channel.send(
            "There's currently a queue being created on this guild. For performance reasons only one queue per guild is allowed.",
          );
          return;
        }
      }
    }
    used[msg.guild.id] = {
      date: new Date(Date.now() + 3600000),
      msg: '',
      cid: '',
    };
    const authorID = msg.author.id;
    msg.channel.send('What do you want the queue to be about?').then((mess) => {
      msg.delete();
      msg.channel
        .awaitMessages((m) => m.author.id === authorID, {
          max: 1,
          time: 60000,
        })
        .then((collected) => {
          if (!collected.first()) {
            msg.channel.send('Cancelled queue creation due to timeout.');
            delete used[msg.guild!.id];
            return;
          }
          const topic = collected.first()!.content;
          collected.first()!.delete();
          mess.delete();
          if (topic.length > 1000) {
            msg.channel.send(
              'Oops, your topic seems to be larger than 1000 characters. Discord message sizes are limited, so please shorten your topic.',
            );
            delete used[msg.guild!.id];
            return;
          }
          msg.channel
            .send(
              'How long is this queue supposed to last? *(in minutes, maximum of 120)*',
            )
            .then((mess2) => {
              msg.channel
                .awaitMessages((m) => m.author.id === authorID, {
                  max: 1,
                  time: 60000,
                })
                .then(async (collected2) => {
                  if (!collected2.first()) {
                    msg.channel.send(
                      'Cancelled queue creation due to timeout.',
                    );
                    delete used[msg.guild!.id];
                    return;
                  }
                  let time = parseInt(collected2.first()!.content, 10);
                  if (!time) {
                    msg.channel.send(
                      'Thats not a real number duh. Cancelled queue creation, try again.',
                    );
                    delete used[msg.guild!.id];
                    return;
                  }
                  if (time > 120) {
                    time = 120;
                  } else if (time < 1) {
                    time = 1;
                  }
                  collected2.first()!.delete();
                  mess2.delete();
                  const authorMember = await msg.guild!.members.fetch(
                    msg.author,
                  );
                  if (!authorMember) {
                    throw new Error('Author not found.');
                  }
                  voiceChannel = authorMember.voice.channel;
                  let remMessage;
                  if (voiceChannel) {
                    const botMember = await msg.guild!.members.fetch(user());
                    if (!botMember.hasPermission('MUTE_MEMBERS')) {
                      remMessage = await msg.channel.send(
                        'If i had MUTE_MEMBERS permission i would be able to (un)mute users in the voice channel automatically. If you want to use that feature restart the command after giving me the additional permissions.',
                      );
                      voiceChannel = null;
                    } else if (
                      await yesOrNo(
                        msg,
                        `Do you want to automatically (un)mute users based on their turn in ${voiceChannel}? `,
                      )
                    ) {
                      remMessage = await msg.channel.send(
                        `Automatically (un)muting users in ${voiceChannel}. This means everyone except users that are considered admin by MagiBot is muted by default.`,
                      );
                    } else {
                      remMessage = await msg.channel.send(
                        `Deactivated automatic (un)muting in ${voiceChannel}.`,
                      );
                      voiceChannel = null;
                    }
                  } else {
                    remMessage = await msg.channel.send(
                      'If you were in a voice channel while setting this up i could automatically (un)mute users. Restart the whole process to do so, if you wish to.',
                    );
                  }
                  msg.channel
                    .send(
                      `Do you want to start the queue **${topic}** lasting **${time} minutes** ?`,
                    )
                    .then(async (mess3) => {
                      const filter = (reaction, usr) => (reaction.emoji.name === '☑'
                          || reaction.emoji.name === '❌')
                        && usr.id === authorID;
                      await mess3.react('☑');
                      await mess3.react('❌');
                      mess3
                        .awaitReactions(filter, {
                          max: 1,
                          time: 20000,
                        })
                        .then(async (reacts) => {
                          await mess3.delete();
                          await remMessage.delete();
                          if (
                            reacts.first()
                            && reacts.first()!.emoji.name === '☑'
                          ) {
                            msg.channel
                              .send(
                                `Queue: **${topic}:**\n\nUse ☑ to join the queue!`,
                              )
                              .then(async (mess4) => {
                                const chann = await bot.channels.fetch(
                                  '433357857937948672',
                                );
                                await mess4.react('➡');
                                await mess4.react('☑');
                                await mess4.react('❌');
                                await mess4.react('🔚');
                                const fil = (reaction, usr) => reaction.emoji.name === '☑'
                                  || reaction.emoji.name === '❌'
                                  || ((reaction.emoji.name === '➡'
                                    || reaction.emoji.name === '🔚')
                                    && usr.id === authorID);
                                time *= 60000;
                                const queuedUsers: Array<User> = [];
                                let activeUser: User | undefined;
                                const collector = mess4.createReactionCollector(
                                  fil,
                                  {
                                    time,
                                  },
                                );
                                const deleteme = await (chann as TextChannel).send(
                                  `Started queue **${topic}** on server **${mess4.guild}**`,
                                );
                                used[msg.guild!.id] = {
                                  date: new Date(Date.now() + time),
                                  cid: mess4.channel.id,
                                  msg: mess4.id,
                                };

                                if (voiceChannel) {
                                  // add the vc to the global variable so joins get muted
                                  queueVoiceChannels[msg.guild!.id] = voiceChannel.id;
                                  // servermute all users in voiceChannel
                                  const memArray = voiceChannel.members.array();
                                  memArray.forEach(async (val) => {
                                    const mem = voiceChannel!.members.get(
                                      val.id,
                                    );
                                    if (
                                      mem
                                      && !(await isAdmin(msg.guild!.id, mem))
                                    ) {
                                      mem.voice.setMute(
                                        true,
                                        'Queue started in this voice channel',
                                      );
                                    }
                                  });
                                }

                                collector.on(
                                  'collect',
                                  async (r, userThatReacted) => {
                                    switch (r.emoji.name) {
                                    case '☑':
                                      if (
                                        !queuedUsers.includes(
                                          userThatReacted,
                                        )
                                          && userThatReacted !== activeUser
                                          && userThatReacted.id !== user().id
                                      ) {
                                        userJoinedQueue();
                                        if (activeUser) {
                                          queuedUsers.push(userThatReacted);
                                          const reactn = mess4.reactions.cache.get(
                                            '❌',
                                          );
                                          if (reactn) {
                                            reactn.users.remove(
                                              userThatReacted,
                                            );
                                          }
                                        } else {
                                          activeUser = userThatReacted;
                                          r.users.remove(activeUser);
                                          msg.channel
                                            .send(
                                              `It's your turn ${activeUser}!`,
                                            )
                                            .then((ms) => {
                                              ms.delete({ timeout: 1000 });
                                            });
                                          if (voiceChannel) {
                                            // unmute currentUser
                                            const currentMember = await msg.guild!.members.fetch(
                                              activeUser,
                                            );
                                            if (currentMember) {
                                              currentMember.voice.setMute(
                                                false,
                                                'Its their turn in the queue',
                                              );
                                            }
                                          }
                                        }
                                        mess4.edit(
                                          messageEdit(
                                            voiceChannel,
                                            activeUser,
                                            queuedUsers,
                                            topic,
                                          ),
                                        );
                                      }
                                      break;
                                    case '➡':
                                      if (queuedUsers[0]) {
                                        if (voiceChannel) {
                                          // mute old current user
                                          if (activeUser) {
                                            const currentMember = await msg.guild!.members.fetch(
                                              activeUser,
                                            );
                                            currentMember.voice.setMute(
                                              true,
                                              'its not your turn in the queue anymore',
                                            );
                                          }
                                        }
                                        activeUser = queuedUsers.shift()!;
                                        r.users.remove(userThatReacted);
                                        mess4.edit(
                                          messageEdit(
                                            voiceChannel,
                                            activeUser,
                                            queuedUsers,
                                            topic,
                                          ),
                                        );
                                        const reactn = mess4.reactions.cache.get(
                                          '☑',
                                        );
                                        if (reactn) {
                                          reactn.users.remove(activeUser);
                                        }
                                        msg.channel
                                          .send(
                                            `It's your turn ${activeUser}!`,
                                          )
                                          .then((ms) => {
                                            ms.delete({ timeout: 1000 });
                                          });
                                        if (voiceChannel) {
                                          // unmute currentUser
                                          const currentMember = await msg.guild!.members.fetch(
                                            activeUser,
                                          );
                                          if (currentMember) {
                                            currentMember.voice.setMute(
                                              false,
                                              'Its their turn in the queue',
                                            );
                                          }
                                        }
                                      } else {
                                        msg.channel
                                          .send('No users left in queue.')
                                          .then((ms) => {
                                            ms.delete({ timeout: 2000 });
                                          });
                                      }
                                      r.users.remove(authorID);
                                      break;
                                    case '❌':
                                      if (
                                        queuedUsers.includes(
                                          userThatReacted,
                                        )
                                          && userThatReacted.id !== user().id
                                      ) {
                                        r.users.remove(userThatReacted);
                                        const rctn = mess4.reactions.cache.get(
                                          '☑',
                                        );
                                        if (rctn) {
                                          rctn.users.remove(userThatReacted);
                                        }
                                        const ind = queuedUsers.findIndex(
                                          (obj) => obj.id === userThatReacted.id,
                                        );
                                        queuedUsers.splice(ind, 1);
                                        mess4.edit(
                                          messageEdit(
                                            voiceChannel,
                                            activeUser,
                                            queuedUsers,
                                            topic,
                                          ),
                                        );
                                      }
                                      break;
                                    case '🔚':
                                      msg.channel
                                        .send('Successfully ended queue.')
                                        .then((ms) => {
                                          ms.delete({ timeout: 5000 });
                                        });
                                      collector.stop();
                                      break;
                                    default:
                                      break;
                                    }
                                  },
                                );
                                collector.on('end', () => {
                                  deleteme.delete();
                                  delete used[msg.guild!.id];
                                  if (voiceChannel) {
                                    delete queueVoiceChannels[msg.guild!.id];
                                    // remove all mutes
                                    voiceChannel.members
                                      .array()
                                      .forEach(async (mem) => {
                                        // make sure users will be unmuted even if this unmute loop
                                        // fails because they left the voice channel too quickly
                                        await toggleStillMuted(
                                          mem.id,
                                          mem.guild.id,
                                          true,
                                        );
                                        await mem.voice.setMute(
                                          false,
                                          'queue ended',
                                        );
                                        await toggleStillMuted(
                                          mem.id,
                                          mem.guild.id,
                                          false,
                                        );
                                      });
                                  }
                                  mess4
                                    .edit(`**${topic}** ended.`)
                                    .catch(() => {});
                                  mess4.reactions.removeAll().catch(() => {});
                                });
                              });
                          } else if (reacts.first()) {
                            msg.channel.send(
                              `successfully canceled queue **${topic}**`,
                            );
                            delete used[msg.guild!.id];
                          } else {
                            msg.channel.send(
                              `Cancelled queue creation of **${topic}** due to timeout.`,
                            );
                            delete used[msg.guild!.id];
                          }
                        });
                    });
                });
            });
        });
    });
  },
  ehelp() {
    return [
      {
        name: '',
        value:
          'Start a queue that can last up to 2h. There is only a single queue allowed per guild.\nYou can activate an optional voicemode which will automatically (un)mute users if you start the queue while connected to a voicechannel.\nYou get all the setup instructions when using the command.',
      },
    ];
  },
  admin: true,
  perm: ['SEND_MESSAGES', 'MANAGE_MESSAGES'],
  dev: false,
  category: commandCategories.util,
};
