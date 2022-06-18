import {
  TextChannel,
  VoiceChannel,
  User,
  Message,
  Guild,
  Snowflake,
  GuildMember,
  StageChannel,
  ButtonInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  InteractionCollector,
} from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { bot } from '../../bot';
import {
  yesOrNo,
  doNothingOnError,
  asyncWait,
  buttonInteractionId,
} from '../../helperFunctions';
import { user, queueVoiceChannels } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { saveUsersWhoJoinedQueue } from '../../statTracking';
import { magibotCommand } from '../../types/command';
import { isAdmin, toggleStillMuted } from '../../dbHelpers';

const used: { [k: string]: { date: Date; msg: string; cid: string } } = {};

function messageEdit(
  voiceChannel: VoiceChannel | null | undefined,
  activeUser: User | null,
  queuedUsers: Array<User>,
  topic: string,
) {
  let msg = `Queue: **${topic}**`;
  if (voiceChannel) {
    msg += `\n*with voicemode activated in* ${voiceChannel}`;
  }
  let nextUsers = '\n';
  if (queuedUsers.length > 0) {
    for (let i = 0; i < 10 && i < queuedUsers.length; i++) {
      nextUsers += `- ${queuedUsers[i]}\n`;
    }
  } else {
    nextUsers = ' no more queued users\n';
  }
  return `${msg}\n*${queuedUsers.length} queued users left*\n\nCurrent user: **${activeUser}**\n\nNext up are:${nextUsers}\nUse the buttons below to join and leave the queue!`;
}

function askQuestion(
  channel: TextChannel,
  authorID: Snowflake,
  question: string,
) {
  return channel.send(question).then((questionMessage) => channel
    .awaitMessages({
      filter: (message) => message.author.id === authorID,
      max: 1,
      time: 60000,
    })
    .then((collected) => {
      questionMessage.delete().catch(doNothingOnError);
      const firstCollected = collected.first();
      if (firstCollected) {
        firstCollected.delete().catch(doNothingOnError);
      } else {
        channel
          .send('Cancelled queue creation due to timeout.')
          .catch(doNothingOnError);
        delete used[channel.guild!.id];
        return null;
      }
      return collected;
    }));
}

async function getQueueTopic(
  guild: Guild,
  channel: TextChannel,
  authorID: Snowflake,
): Promise<string | null> {
  return askQuestion(
    channel,
    authorID,
    'What do you want the queue to be about?',
  ).then((collected) => {
    if (!collected) {
      return null;
    }
    const topic = collected.first()!.content;
    collected.first()!.delete().catch(doNothingOnError);
    if (topic.length > 1000) {
      channel.send(
        'Oops, your topic seems to be larger than 1000 characters. Discord message sizes are limited, so please shorten your topic.',
      );
      delete used[guild!.id];
      return null;
    }
    return topic;
  });
}

async function getQueueTimeout(
  guild: Guild,
  channel: TextChannel,
  author: GuildMember,
): Promise<null | number> {
  return askQuestion(
    channel,
    author.id,
    'How long is this queue supposed to last? *(in minutes, maximum of 120)*',
  ).then((collected) => {
    if (!collected) {
      return null;
    }
    let time = parseInt(collected.first()!.content, 10);
    if (!time) {
      channel.send(
        "That's not a real number duh. Cancelled queue creation, try again.",
      );
      delete used[guild!.id];
      return null;
    }
    if (time > 120) {
      time = 120;
    } else if (time < 1) {
      time = 1;
    }
    return time;
  });
}

async function startQueue(
  guild: Guild,
  channel: TextChannel,
  message: Message,
  author: GuildMember,
  topic: string,
  time: number,
) {
  let voiceChannel: VoiceChannel | StageChannel | null | undefined = author.voice.channel;
  let remMessage: Message;
  if (voiceChannel) {
    const botMember = await guild!.members.fetch(user());
    if (!botMember.permissions.has('MUTE_MEMBERS')) {
      remMessage = await channel.send(
        'If i had MUTE_MEMBERS permission i would be able to (un)mute users in the voice channel automatically. If you want to use that feature restart the command after giving me the additional permissions.',
      );
      voiceChannel = null;
    } else if (
      await yesOrNo(
        message,
        `Do you want to automatically (un)mute users based on their turn in ${voiceChannel}? `,
      )
    ) {
      remMessage = await message.channel.send(
        `Automatically (un)muting users in ${voiceChannel}. This means everyone except users that are considered admin by MagiBot is muted by default.`,
      );
    } else {
      remMessage = await message.channel.send(
        `Deactivated automatic (un)muting in ${voiceChannel}.`,
      );
      voiceChannel = null;
    }
  } else {
    remMessage = await message.channel.send(
      'If you were in a voice channel while setting this up i could automatically (un)mute users. Restart the whole process to do so, if you wish to.',
    );
  }
  const wantsToStartQueue = await yesOrNo(
    message,
    `Do you want to start the queue **${topic}** lasting **${time} minutes** ?`,
    `Successfully canceled queue **${topic}**`,
    `Cancelled queue creation of **${topic}** due to timeout.`,
  );
  remMessage.delete().catch(doNothingOnError);
  if (!wantsToStartQueue) {
    delete used[guild!.id];
    return false;
  }
  return voiceChannel;
}

// eslint being stupid again
// eslint-disable-next-line no-shadow
const enum typeOfQueueAction {
  next = 'next',
  end = 'end',
  join = 'join',
  leave = 'leave',
}

async function onQueueAction(
  interaction: ButtonInteraction,
  channel: TextChannel,
  voiceChannel: VoiceChannel | null,
  topicMessage: Message,
  topic: string,
  queuedUsers: Array<User>,
  sharedQueueData: { activeUser: User | null },
  collector: InteractionCollector<MessageComponentInteraction>,
  author: GuildMember,
) {
  const typeOfAction: typeOfQueueAction = interaction.customId.split(
    '-',
  )[2] as any;
  const actionUser = interaction.user;
  switch (typeOfAction) {
  case typeOfQueueAction.join:
    // eslint-disable-next-line no-case-declarations
    const indexOfUser = queuedUsers.indexOf(actionUser);
    if (indexOfUser === -1 && actionUser !== sharedQueueData.activeUser) {
      saveUsersWhoJoinedQueue(bot.shard!.ids[0]);
      if (sharedQueueData.activeUser) {
        queuedUsers.push(actionUser);
      } else {
        // eslint-disable-next-line no-param-reassign
        sharedQueueData.activeUser = actionUser;
        const message = await channel.send(
          `It's your turn ${sharedQueueData.activeUser}!`,
        );
        asyncWait(1000).then(() => message.delete());
        if (voiceChannel) {
          // TODO rework muting in here
          // unmute currentUser
          const currentMember = await interaction.guild!.members.fetch(
            actionUser,
          );
          if (currentMember) {
            currentMember.voice
              .setMute(false, 'Its their turn in the queue')
              .catch(doNothingOnError);
          }
        }
      }
      topicMessage
        .edit(
          messageEdit(
            voiceChannel,
            sharedQueueData.activeUser,
            queuedUsers,
            topic,
          ),
        )
        .catch(doNothingOnError);
      interaction.reply({
        content: `Successfully joined the queue! Your position is: ${queuedUsers.length}`,
        ephemeral: true,
      });
    } else if (indexOfUser !== -1) {
      interaction.reply({
        content: `You were already in the queue! Your current position is: ${
          indexOfUser + 1
        }`,
        ephemeral: true,
      });
    } else {
      interaction.reply({
        content: "It's your turn!",
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.leave:
    if (queuedUsers.includes(actionUser)) {
      const ind = queuedUsers.findIndex((obj) => obj.id === actionUser.id);
      queuedUsers.splice(ind, 1);
      topicMessage
        .edit(
          messageEdit(
            voiceChannel,
            sharedQueueData.activeUser,
            queuedUsers,
            topic,
          ),
        )
        .catch(doNothingOnError);
      interaction.reply({
        content: 'Successfully left the queue!',
        ephemeral: true,
      });
    } else {
      interaction.reply({
        content: 'You are not in the queue anyways!',
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.next:
    // only creator of queue is allowed to do this
    if (author.id !== interaction.member?.user.id) {
      return;
    }
    if (queuedUsers[0]) {
      if (voiceChannel) {
        // mute old current user
        if (sharedQueueData.activeUser) {
          const currentMember = await interaction.guild!.members.fetch(
            sharedQueueData.activeUser,
          );
          currentMember.voice
            .setMute(true, 'its not your turn in the queue anymore')
            .catch(doNothingOnError);
        }
      }
      // eslint-disable-next-line no-param-reassign
      sharedQueueData.activeUser = queuedUsers.shift()!;
      topicMessage
        .edit(
          messageEdit(
            voiceChannel,
            sharedQueueData.activeUser,
            queuedUsers,
            topic,
          ),
        )
        .catch(doNothingOnError);
      const message = await channel.send(
        `It's your turn ${sharedQueueData.activeUser}!`,
      );
      asyncWait(1000).then(() => message.delete());
      if (voiceChannel) {
        // unmute currentUser
        const currentMember = await interaction.guild!.members.fetch(
          sharedQueueData.activeUser,
        );
        if (currentMember) {
          currentMember.voice
            .setMute(false, 'Its their turn in the queue')
            .catch(doNothingOnError);
        }
      }
      interaction.reply({
        content: 'Successfully moved the queue to the next user!',
        ephemeral: true,
      });
    } else {
      interaction.reply({
        content: 'There are no users left in the queue!',
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.end:
    // only creator of queue is allowed to do this
    if (author.id !== interaction.member?.user.id) {
      return;
    }
    interaction.reply({
      content: 'Successfully ended the queue!',
      ephemeral: true,
    });
    collector.stop('Ended by user.');
    break;
  default:
    break;
  }
}

function onEnd(
  guild: Guild,
  voiceChannel: VoiceChannel | null,
  debugMessage: Message | null,
  topicMessage: Message,
  topic: string,
) {
  if (debugMessage) {
    debugMessage.delete().catch(doNothingOnError);
  }
  delete used[guild.id];
  if (voiceChannel) {
    queueVoiceChannels.delete(guild.id);
    // remove all mutes
    voiceChannel.members.forEach((member) => {
      // make sure users will be unmuted even if this unmute loop
      // fails because they left the voice channel too quickly
      toggleStillMuted(member.id, guild.id, true)
        .then(() => member.voice.setMute(false, 'queue ended'))
        .then(() => toggleStillMuted(member.id, guild.id, false))
        .catch(doNothingOnError);
    });
  }
  topicMessage
    .edit({ content: `**${topic}** ended.`, components: [] })
    .catch(doNothingOnError);
}

async function createQueue(
  guild: Guild,
  channel: TextChannel,
  message: Message,
  author: GuildMember,
) {
  const topic = await getQueueTopic(guild, channel, author.id);
  if (!topic) {
    return;
  }

  let time = await getQueueTimeout(guild, channel, author);
  if (!time) {
    return;
  }

  const startQueueValue = await startQueue(
    guild,
    channel,
    message,
    author,
    topic,
    time,
  );
  if (startQueueValue === false) {
    return;
  }
  const voiceChannel = startQueueValue as VoiceChannel | null;
  time *= 60000;

  const debugMessage: Message | null = null;
  // TODO maybe readd this with webhooks? but honestly just not needed atm.
  /* if (debugChannel) {
    debugMessage = await (debugChannel as TextChannel).send(
      `Started queue **${topic}** on server **${topicMessage.guild}**`,
    );
  } */

  const row = new MessageActionRow();
  row.addComponents(
    new MessageButton()
      .setCustomId(`${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.next}`)
      .setLabel('Next User')
      .setStyle('PRIMARY'),
  );
  row.addComponents(
    new MessageButton()
      .setCustomId(`${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.end}`)
      .setLabel('End Queue')
      .setStyle('SECONDARY'),
  );
  const rowTwo = new MessageActionRow();
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(`${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.join}`)
      .setLabel('Join Queue')
      .setStyle('SUCCESS'),
  );
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(`${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.leave}`)
      .setLabel('Leave Queue')
      .setStyle('SECONDARY'),
  );

  const topicMessage = await channel.send({
    content: `Queue: **${topic}:**\n\nUse the buttons below to join the queue!`,
    components: [row, rowTwo],
  });
  used[guild.id] = {
    date: new Date(Date.now() + time),
    cid: topicMessage.channel.id,
    msg: topicMessage.id,
  };

  if (voiceChannel) {
    // add the vc to the global variable so joins get muted
    queueVoiceChannels.set(guild.id, voiceChannel.id);
    // servermute all users in voiceChannel
    const voiceChannelMembers = voiceChannel.members;
    voiceChannelMembers.forEach(async (member) => {
      if (member && !(await isAdmin(guild.id, member))) {
        member.voice
          .setMute(true, 'Queue started in this voice channel')
          .catch(doNothingOnError);
      }
    });
  }

  const filter = (interaction: MessageComponentInteraction) => interaction.customId.startsWith(`${buttonInteractionId.queue}-${guild.id}-`);
  const collector = topicMessage.createMessageComponentCollector({
    filter,
    time,
  });
  const sharedQueueData: { activeUser: User | null } = { activeUser: null };
  const queuedUsers: Array<User> = [];
  collector.on('collect', async (interaction) => {
    await onQueueAction(
      interaction as ButtonInteraction,
      channel,
      voiceChannel,
      topicMessage,
      topic,
      queuedUsers,
      sharedQueueData,
      collector,
      author,
    );
  });
  collector.once('end', (/* collected */) => {
    onEnd(guild, voiceChannel, debugMessage, topicMessage, topic);
  });
}

export const queue: magibotCommand = {
  hide: false,
  name: 'queue',
  async main({ message }) {
    if (
      !message.guild
      || !(message.channel instanceof TextChannel)
      || !message.member
    ) {
      return;
    }
    const { guild, member: author, channel } = message;
    if (used[guild.id]) {
      const d = new Date();
      if (d.getTime() - used[guild.id].date.getTime() <= 0) {
        // check if its already 2hours old
        if (used[guild.id].msg && used[guild.id].cid) {
          const previousChannel = guild.channels.cache.get(used[guild.id].cid);
          if (
            previousChannel
            && (await (previousChannel as TextChannel).messages
              .fetch(used[guild.id].msg)
              .catch(doNothingOnError))
          ) {
            channel
              .send(
                "There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.",
              )
              .catch(doNothingOnError);
            return;
          }
        } else {
          channel
            .send(
              "There's currently a queue being created on this guild. For performance reasons only one queue per guild is allowed.",
            )
            .catch(doNothingOnError);
          return;
        }
      }
    }
    used[guild.id] = {
      date: new Date(Date.now() + 3600000),
      msg: '',
      cid: '',
    };

    message.delete().catch(doNothingOnError);

    await createQueue(guild, channel, message, author);
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
  perm: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'], // TODO validate if this is what we need
  dev: false,
  category: commandCategories.util,
};
