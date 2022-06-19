import {
  VoiceChannel,
  User,
  Message,
  Guild,
  GuildMember,
  ButtonInteraction,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  InteractionCollector,
  CommandInteraction,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { bot } from '../../bot';
import {
  doNothingOnError,
  asyncWait,
  buttonInteractionId,
} from '../../helperFunctions';
import { queueVoiceChannels } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
import { saveUsersWhoJoinedQueue } from '../../statTracking';
import { isAdmin, toggleStillMuted } from '../../dbHelpers';
import { MagibotAdminSlashCommand } from '../../types/command';

const runningQueues = new Map<
  string,
  { endDate: Date; interactionId: string }
>();

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

/* async function startQueueOld(
  guild: Guild,
  channel: TextChannel,
  message: Message,
  author: GuildMember,
  topic: string,
  time: number,
) {
  const voiceChannel: VoiceChannel | StageChannel | null | undefined = author.voice.channel;
  // let remMessage: Message;
  if (voiceChannel) {
    // TODO rework the muting by adjusting channel permissions instead of user permissions.
     const botMember = await guild!.members.fetch(user());
    if (!botMember.permissions.has('MUTE_MEMBERS')) {
      remMessage = await channel.send(
        'If i had MUTE_MEMBERS permission i would be able to (un)mute users in
 the voice channel automatically. If you want to use that feature restart the
command after giving me the additional permissions.',
      );
      voiceChannel = null;
    } else if (
      await yesOrNo(
        message,
        `Do you want to automatically (un)mute users based on their turn in ${voiceChannel}? `,
      )
    ) {
      remMessage = await message.channel.send(
        `Automatically (un)muting users in ${voiceChannel}. This means everyone except
users that are considered admin by MagiBot is muted by default.`,
      );
    } else {
      remMessage = await message.channel.send(
        `Deactivated automatic (un)muting in ${voiceChannel}.`,
      );
      voiceChannel = null;
    }
  } else {
     remMessage = await message.channel.send(
      'If you were in a voice channel while setting this up i could automatically (un)mute users.
 Restart the whole process to do so, if you wish to.',
    );
  }
  const wantsToStartQueue = await yesOrNo(
    message,
    `Do you want to start the queue **${topic}** lasting **${time} minutes** ?`,
    `Successfully canceled queue **${topic}**`,
    `Cancelled queue creation of **${topic}** due to timeout.`,
  );
  // remMessage.delete().catch(doNothingOnError);
  if (!wantsToStartQueue) {
    return false;
  }
  return voiceChannel;
} */

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
  voiceChannel: VoiceChannel | null,
  topicMessage: Message,
  topic: string,
  queuedUsers: Array<User>,
  sharedQueueData: { activeUser: User | null },
  collector: InteractionCollector<MessageComponentInteraction>,
) {
  await interaction.deferReply();
  const typeOfAction = interaction.customId.split('-')[2] as typeOfQueueAction;
  const actionUser = interaction.user;
  switch (typeOfAction) {
  case typeOfQueueAction.join:
    // eslint-disable-next-line no-case-declarations
    const indexOfUser = queuedUsers.indexOf(actionUser);
    if (
      indexOfUser === -1
        && (!sharedQueueData.activeUser
          || actionUser.id !== sharedQueueData.activeUser.id)
    ) {
      saveUsersWhoJoinedQueue(bot.shard!.ids[0]);
      if (sharedQueueData.activeUser) {
        queuedUsers.push(actionUser);
      } else {
        // eslint-disable-next-line no-param-reassign
        sharedQueueData.activeUser = actionUser;
        const message = (await interaction.followUp(
          `It's your turn ${sharedQueueData.activeUser}!`,
        )) as Message;
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
      interaction.followUp({
        content: `Successfully joined the queue! Your position is: ${queuedUsers.length}`,
        ephemeral: true,
      });
    } else if (indexOfUser !== -1) {
      interaction.followUp({
        content: `You were already in the queue! Your current position is: ${
          indexOfUser + 1
        }`,
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
      interaction.followUp({
        content: 'Successfully left the queue!',
        ephemeral: true,
      });
    } else {
      interaction.followUp({
        content: 'You are not in the queue anyways!',
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.next:
    // only admins of guild are allowed to do this
    if (
      !(await isAdmin(
          interaction.guild!.id,
          interaction.member as GuildMember,
      ))
    ) {
      interaction.followUp({
        content: 'You are not allowed to use this!',
        ephemeral: true,
      });
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
      const message = (await interaction.followUp(
        `It's your turn ${sharedQueueData.activeUser}!`,
      )) as Message;
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
      interaction.followUp({
        content: 'Successfully moved the queue to the next user!',
        ephemeral: true,
      });
    } else {
      interaction.followUp({
        content: 'There are no users left in the queue!',
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.end:
    // only admins of guild are allowed to do this
    if (
      !(await isAdmin(
          interaction.guild!.id,
          interaction.member as GuildMember,
      ))
    ) {
      interaction.followUp({
        content: 'You are not allowed to use this!',
        ephemeral: true,
      });
      return;
    }
    interaction.followUp({
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
  runningQueues.delete(guild.id);
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

const defaultQueueLengthInMinutes = 120;

async function startQueue(interaction: CommandInteraction, topic: string) {
  const guild = interaction.guild!;

  if (runningQueues.has(guild.id)) {
    interaction.followUp(
      "There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.",
    );
    return;
  }

  // TODO continue reworking from here on

  // TODO get a voice channel? take a look at "startQueueOld"

  const voiceChannel = null as VoiceChannel | null;
  const millisecondsUntilEnd = defaultQueueLengthInMinutes * 60000;

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
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.next}`,
      )
      .setLabel('Next User')
      .setStyle('PRIMARY'),
  );
  row.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.end}`,
      )
      .setLabel('End Queue')
      .setStyle('SECONDARY'),
  );
  const rowTwo = new MessageActionRow();
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.join}`,
      )
      .setLabel('Join Queue')
      .setStyle('SUCCESS'),
  );
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.leave}`,
      )
      .setLabel('Leave Queue')
      .setStyle('SECONDARY'),
  );

  const topicMessage = (await interaction.followUp({
    content: `Queue: **${topic}:**\n\nUse the buttons below to join the queue!`,
    components: [row, rowTwo],
  })) as Message;
  runningQueues.set(guild.id, {
    endDate: new Date(Date.now() + millisecondsUntilEnd),
    interactionId: interaction.id,
    // TODO do we need anything else?
  });

  if (voiceChannel) {
    // TODO rework
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

  const collector = topicMessage.createMessageComponentCollector({
    filter: (buttonInteraction) => buttonInteraction.customId.startsWith(
      `${buttonInteractionId.queue}-${guild.id}-`,
    ),
    time: millisecondsUntilEnd,
  });
  const sharedQueueData: { activeUser: User | null } = { activeUser: null };
  const queuedUsers: Array<User> = [];
  collector.on('collect', async (buttonInteraction) => {
    await onQueueAction(
      buttonInteraction as ButtonInteraction,
      voiceChannel,
      topicMessage,
      topic,
      queuedUsers,
      sharedQueueData,
      collector,
    );
  });
  collector.once('end', (/* collected */) => {
    onEnd(guild, voiceChannel, debugMessage, topicMessage, topic);
  });
}

function registerSlashCommand(builder: SlashCommandBuilder) {
  return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
    .setName('queue')
    .setDescription(
      'Manage queues for events such as karaoke or playing view viewers.',
    )
    .addSubcommand((subcommand) => subcommand
      .setName('start')
      .setDescription('Start a queue that can last up to 2h.')
      .addStringOption((option) => option
        .setName('topic')
        .setDescription('The topic of the queue.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('stop')
      .setDescription('Stop the running queue of this server.'))
    .addSubcommand((subcommand) => subcommand
      .setName('extend')
      .setDescription('Extend the running queue of this server.')));
}

async function runCommand(interaction: CommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as
    | 'start'
    | 'stop'
    | 'extend';

  // TODO migrate actual functionality of the main function

  if (subcommand === 'start') {
    const topic = interaction.options.getString('topic', true);
    await startQueue(interaction, topic);
    return;
  }
  if (subcommand === 'stop') {
    // TODO do we actually want to allow this?
    console.log('stop');
    return;
  }
  if (subcommand === 'extend') {
    // TODO do we actually want to allow this?
    console.log('extend');
  }
}

export const queue: MagibotAdminSlashCommand = {
  help() {
    return [
      {
        name: '',
        value:
          'Start a queue that can last up to 2h. There is only a single queue allowed per guild.',
      },
    ];
  },
  permissions: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'], // TODO validate if this is what we need
  category: commandCategories.util,
  run: runCommand,
  registerSlashCommand,
};
