// commands made by Basti for use of the Bot
module.exports = {
  findMember: async function findMember(guild, mention) {
    if (!mention) {
      return false;
    }
    mention = mention.toLowerCase();
    if (mention.startsWith('<@') && mention.endsWith('>')) {
      let id = mention.slice(2, -1);
      if (id.startsWith('!')) {
        id = id.substr(1);
      }
      return id;
    }
    const user = await guild.fetchMember(mention).catch(() => { });
    if (user) {
      return user.id;
    }
    if (mention.length >= 3) {
      let memberArray = await guild.members.filterArray(memb => memb.displayName.toLowerCase().startsWith(mention));
      if (memberArray.length == 1) {
        return memberArray[0].id;
      }
      if (memberArray.length == 0) {
        memberArray = await guild.members.filterArray(memb => memb.displayName.toLowerCase().includes(mention));
        if (memberArray.length == 1) {
          return memberArray[0].id;
        }
      }
    }
    return false;
  },
  findRole: async function findRole(guild, mention) {
    if (!mention) {
      return false;
    }
    mention = mention.toLowerCase();
    if (mention.startsWith('<@&') && mention.endsWith('>')) {
      const id = mention.substr(3).slice(0, -1);
      return id;
    }
    const role = await guild.roles.get(mention);
    if (role) {
      return role.id;
    }
    if (mention.length >= 3) {
      let roleArray = await guild.roles.filterArray(rol => rol.name.toLowerCase().startsWith(mention));
      if (roleArray.length == 1) {
        return roleArray[0].id;
      }
      if (roleArray.length == 0) {
        roleArray = await guild.roles.filterArray(rol => rol.name.toLowerCase().includes(mention));
        if (roleArray.length == 1) {
          return roleArray[0].id;
        }
      }
    }
    return false;
  },
  // this is an idea to implement rather reusable confirmation processes. ; abortMessage, timeoutMessage and time are optional parameters
  yesOrNo: async (msg, question, abortMessage, timeoutMessage, time) => msg.channel.send(question).then(async mess => {
    const filter = (reaction, user) => (reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id;
    await mess.react('☑');
    await mess.react('❌');
    if (!time) {
      time = 20000;
    }
    return mess.awaitReactions(filter, { max: 1, time }).then(async reacts => {
      mess.delete();
      if (reacts.first() && reacts.first().emoji.name == '☑') {
        return true;
      } else if (reacts.first()) {
        if (abortMessage) {
          msg.channel.send(abortMessage);
        }
        return false;
      }
      if (!timeoutMessage) {
        timeoutMessage = 'Cancelled due to timeout.';
      }
      await msg.channel.send(timeoutMessage);
      return false;
    });
  }),
  printError: error => {
    console.error(`Errorstatus: ${error.response.status} ${error.response.statusText}`);
  },
  catchError: (err, bot, msg, command) => {
    if (err.stack) {
      err = err.stack;
    }
    console.error(`Caught:\n${err}\nin command ${command} ${msg.content}`);
    const chann = bot.channels.get('414809410448261132');
    chann.send(`**Command:** ${command} ${msg.content}\n**Caught Error:**\n\`\`\`${err}\`\`\``);
    msg.reply(`something went wrong while using ${command}. The devs have been automatically notified.\nIf you can reproduce this, consider using \`${bot.PREFIXES[msg.guild.id]}.bug <bugreport>\` or join the support discord (link via \`${bot.PREFIXES[msg.guild.id]}.info\`) to tell us exactly how.`).catch(() => {});
  },
  catchErrorOnDiscord: (bot, err) => {
    try {
      const chann = bot.channels.get('414809410448261132');
      chann.send(`Caught error: ${err}`);
    } catch (error) {
      console.error(error);
    }
  }
};
