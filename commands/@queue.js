const used = {};
const data = require(`${__dirname}/../db.js`);
const cmds = require(`${__dirname}/../bamands.js`);


function messageEdit(voiceChannel, activeUser, qU, topic) {
  let msg = `Queue: **${topic}**`;
  if (voiceChannel) {
    msg += `\n*with voicemode activated in* ${voiceChannel}`;
  }
  let tmpms = '\n';
  let count = 0;
  if (qU.length > 0) {
    for (const i in qU) {
      count++;
      const u = qU[i];
      if (!u || count > 10) {
        break;
      }
      tmpms += `- ${u}\n`;
    }
  } else {
    tmpms = ' no more queued users\n';
  }
  msg += `\n*${qU.length} queued users left*\n\nCurrent user: **${activeUser}**\n\nNext up are:${tmpms}\nUse ☑ to join and ❌ to leave the queue!`;
  return msg;
}


module.exports = {
  async main(bot, msg) {
    let voiceChannel;
    if (used[msg.guild.id]) {
      const d = new Date();
      if ((d - used[msg.guild.id].date) <= 0) { // check if its already 2hours old
        if (used[msg.guild.id].msg && used[msg.guild.id].cid) {
          const testchann = await msg.guild.channels.get(used[msg.guild.id].cid);
          if (testchann && await testchann.fetchMessage(used[msg.guild.id].msg).catch(() => { })) {
            msg.channel.send("There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.");
            return;
          }
        } else {
          msg.channel.send("There's currently a queue being created on this guild. For performance reasons only one queue per guild is allowed.");
          return;
        }
      }
    }
    used[msg.guild.id] = { date: new Date(Date.now() + 3600000) };
    const authorID = msg.author.id;
    msg.channel.send('What do you want the queue to be about?').then(mess => {
      msg.delete();
      msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
        if (!collected.first()) {
          msg.channel.send('Cancelled queue creation due to timeout.');
          used[msg.guild.id] = false;
          return;
        }
        const topic = collected.first().content;
        collected.first().delete();
        mess.delete();
        msg.channel.send('How long is this queue supposed to last? *(in minutes, maximum of 120)*').then(mess2 => {
          msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(async collected2 => {
            if (!collected2.first()) {
              msg.channel.send('Cancelled queue creation due to timeout.');
              used[msg.guild.id] = false;
              return;
            }
            let time = parseInt(collected2.first().content, 10);
            if (isNaN(time)) {
              msg.channel.send('Thats not a real number duh. Cancelled queue creation, try again.');
              used[msg.guild.id] = false;
              return;
            }
            if (time > 120) {
              time = 120;
            } else if (time < 1) {
              time = 1;
            }
            collected2.first().delete();
            mess2.delete();
            const authorMember = await msg.guild.fetchMember(msg.author);
            voiceChannel = authorMember.voiceChannel;
            let remMessage;
            if (voiceChannel) {
              const botMember = await msg.guild.fetchMember(bot.user);
              if (!botMember.hasPermission('MUTE_MEMBERS')) {
                remMessage = await msg.channel.send('If i had MUTE_MEMBERS permission i would be able to (un)mute users in the voice channel automatically. If you want to use that feature restart the command after giving me the additional permissions.');
                voiceChannel = false;
              } else if (await cmds.yesOrNo(msg, `Do you want to automatically (un)mute users based on their turn in ${voiceChannel}? `)) {
                remMessage = await msg.channel.send(`Automatically (un)muting users in ${voiceChannel}. This means everyone except users that are considered admin by MagiBot is muted by default.`);
              } else {
                remMessage = await msg.channel.send(`Deactivated automatic (un)muting in ${voiceChannel}.`);
                voiceChannel = false;
              }
            } else {
              remMessage = await msg.channel.send('If you were in a voice channel while setting this up i could automatically (un)mute users. Restart the whole process to do so, if you wish to.');
            }
            msg.channel.send(`Do you want to start the queue **${topic}** lasting **${time} minutes** ?`).then(async mess3 => {
              const filter = (reaction, user) => (reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id == authorID;
              await mess3.react('☑');
              await mess3.react('❌');
              mess3.awaitReactions(filter, { max: 1, time: 20000 }).then(async reacts => {
                await mess3.delete();
                await remMessage.delete();
                if (reacts.first() && reacts.first().emoji.name == '☑') {
                  msg.channel.send(`Queue: **${topic}:**\n\nUse ☑ to join the queue!`).then(async mess4 => {
                    const chann = bot.channels.get('433357857937948672');
                    await mess4.react('➡');
                    await mess4.react('☑');
                    await mess4.react('❌');
                    await mess4.react('🔚');
                    const fil = (reaction, user) => reaction.emoji.name == '☑' || reaction.emoji.name == '❌' || ((reaction.emoji.name == '➡' || reaction.emoji.name == '🔚') && user.id == authorID);
                    time *= 60000;
                    const queuedUsers = [];
                    let activeUser = false;
                    const collector = mess4.createReactionCollector(fil, { time });
                    const deleteme = await chann.send(`Started queue **${topic}** on server **${mess4.guild}**`);
                    used[msg.guild.id] = { date: new Date(Date.now() + time), cid: mess4.channel.id, msg: mess4.id };

                    if (voiceChannel) {
                      // add the vc to the global variable so joins get muted
                      bot.queueVoiceChannels[msg.guild.id] = voiceChannel.id;
                      // servermute all users in voiceChannel
                      const memArray = voiceChannel.members.array();
                      for (let mem in memArray) {
                        mem = voiceChannel.members.get(memArray[mem].id);
                        if (!await data.isAdmin(msg.guild.id, mem, bot)) {
                          mem.setMute(true, 'queue started in this voice channel');
                        }
                      }
                    }

                    collector.on('collect', async r => {
                      switch (r.emoji.name) {
                      case '☑':
                        /* eslint-disable no-case-declarations*/
                        let users = r.users;
                        /* eslint-enable no-case-declarations*/
                        users = users.array();
                        for (const u in users) {
                          const user = users[u];
                          if (!queuedUsers.includes(user) && user != activeUser && user.id != bot.user.id) {
                            if (activeUser) {
                              queuedUsers.push(user);
                              mess4.reactions.get('❌').remove(user);
                            } else {
                              activeUser = user;
                              r.remove(activeUser);
                              msg.channel.send(`It's your turn ${activeUser}!`).then(ms => {
                                ms.delete(1000);
                              });
                              if (voiceChannel) {
                                // unmute currentUser
                                const currentMember = await msg.guild.fetchMember(activeUser);
                                currentMember.setMute(false, 'its your turn in the queue');
                              }
                            }
                            mess4.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                          }
                        }
                        break;
                      case '➡':
                        if (queuedUsers[0]) {
                          if (voiceChannel) {
                            // mute old current user
                            const currentMember = await msg.guild.fetchMember(activeUser);
                            currentMember.setMute(true, 'its not your turn in the queue anymore');
                          }
                          activeUser = queuedUsers.shift();
                          r.remove(activeUser);
                          mess4.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                          mess4.reactions.get('☑').remove(activeUser);
                          msg.channel.send(`It's your turn ${activeUser}!`).then(ms => {
                            ms.delete(1000);
                          });
                          if (voiceChannel) {
                            // unmute currentUser
                            const currentMember = await msg.guild.fetchMember(activeUser);
                            currentMember.setMute(false, 'its your turn in the queue');
                          }
                        } else {
                          msg.channel.send('No users left in queue.').then(ms => {
                            ms.delete(2000);
                          });
                        }
                        r.remove(authorID);
                        break;
                      case '❌':
                        /* eslint-disable no-case-declarations*/
                        let sers = r.users;
                        /* eslint-enable no-case-declarations*/
                        sers = sers.array();
                        for (const u in sers) {
                          const user = sers[u];
                          if (queuedUsers.includes(user) && user.id != bot.user.id) {
                            r.remove(user);
                            mess4.reactions.get('☑').remove(user);
                            const ind = queuedUsers.findIndex(obj => obj.id == user.id);
                            queuedUsers.splice(ind, 1);
                            mess4.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                          }
                        }
                        break;
                      case '🔚':
                        msg.channel.send('Successfully ended queue.').then(ms => {
                          ms.delete(5000);
                        });
                        collector.stop();
                        break;
                      default:
                        break;
                      }
                    });
                    collector.on('end', () => {
                      deleteme.delete();
                      used[msg.guild.id] = false;
                      if (voiceChannel) {
                        delete bot.queueVoiceChannels[msg.guild.id];
                        // remove all mutes
                        const memArray = voiceChannel.members.array();
                        for (const mem in memArray) {
                          voiceChannel.members.get(memArray[mem].id).setMute(false, 'queue ended');
                        }
                      }
                      mess4.edit(`**${topic}** ended.`).catch(() => { });
                      mess4.clearReactions().catch(() => { });
                    });
                  });
                } else if (reacts.first()) {
                  msg.channel.send(`successfully canceled queue **${topic}**`);
                  used[msg.guild.id] = false;
                }
              });
            });
          });
        });
      });
    });
  },
  ehelp() {
    return [{ name: '', value: 'Start a queue that can last up to 2h. There is only a single queue allowed per guild.\nYou can activate an optional voicemode which will automatically (un)mute users if you start the queue while connected to a voicechannel.\nYou get all the setup instructions when using the command.' }];
  },
  admin: true,
  perm: ['SEND_MESSAGES', 'MANAGE_MESSAGES'],
  dev: false,
  category: 'Utility'
};
