import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import Discord, {
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  InteractionReplyOptions,
  Message,
  MessageComponentInteraction,
} from 'discord.js';
import { user } from './shared_assets';
import { DeferReply } from './types/command';

export function doNothingOnError() {}

export function returnNullOnError() {
  return null;
}
export async function findMember(
  guild: Discord.Guild,
  userMention: string,
): Promise<{ user: Discord.GuildMember | null; fuzzy?: boolean }> {
  if (!userMention || userMention.length === 0) {
    return { user: null };
  }
  let mention = userMention.toLowerCase();
  if (mention.startsWith('<@') && mention.endsWith('>')) {
    mention = mention.slice(2, -1);
    if (mention.startsWith('!')) {
      mention = mention.substr(1);
    }
  }
  // fails if its not a snowflake
  const member = await guild.members.fetch(mention).catch(returnNullOnError);
  if (member) {
    return { user: member, fuzzy: false };
  }
  // it will sometimes only find one if multiple would fit (even with higher limit).
  // so we just call it fuzzy and take the first we get
  const membersFound = await guild.members.search({ query: mention, limit: 1 });
  if (membersFound.size >= 1) {
    return { user: membersFound.first()!, fuzzy: true };
  }
  return { user: null };
}

export async function findRole(guild: Discord.Guild, ment: string) {
  if (!ment) {
    return false;
  }
  const mention = ment.toLowerCase();
  if (mention.startsWith('<@&') && mention.endsWith('>')) {
    const id = mention.substr(3).slice(0, -1);
    return id;
  }
  const role = await guild.roles.fetch(mention);
  if (role) {
    return role.id;
  }
  if (mention.length >= 3) {
    let roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().startsWith(mention));
    if (roleArray.size === 1) {
      return roleArray.first()!.id;
    }
    if (roleArray.size === 0) {
      roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().includes(mention));
      if (roleArray.size === 1) {
        return roleArray.first()!.id;
      }
    }
  }
  return false;
}

// for some reason eslint doesnt get this...
// eslint-disable-next-line no-shadow
export const enum buttonInteractionId {
  'confirmation' = 0x0001,
  'queue' = 0x1001,
}

export async function notifyAboutSlashCommand(
  message: Message,
  command: string,
) {
  try {
    await message.reply(`This command has been moved to application (/) commands! You can use it via \`/${command}\`!

If you can't find it, either you are missing permissions, or the admins of this server have not given MagiBot permission to create application commands yet.
To do the latter, re-invite the bot by clicking the big blue "Add to Server" button in the bot's profile!`);
  } catch (error) {
    console.error('Failed sending command has moved message:', error);
  }
}

export function doesInteractionRequireFollowup(
  interaction: CommandInteraction | ButtonInteraction,
) {
  return interaction.replied || interaction.deferred;
}

// this is an idea to implement rather reusable confirmation processes.
// ; abortMessage, timeoutMessage and time are optional parameters
export async function interactionConfirmation(
  interaction: Discord.CommandInteraction,
  question: string,
  deferralType?: DeferReply | false,
  abortMessage: string = 'Cancelled.',
  timeoutMessage: string = 'Timeouted.',
  timeoutTime: number = 20000,
): Promise<MessageComponentInteraction | null> {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${buttonInteractionId.confirmation}-${interaction.id}-yes`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${buttonInteractionId.confirmation}-${interaction.id}-no`)
      .setLabel('No')
      .setStyle(ButtonStyle.Danger),
  );

  // always prefer ephemeral where possible
  const ephemeral = deferralType !== DeferReply.public;

  const messageContent: InteractionReplyOptions = {
    content: question,
    components: [row as any], // type is incompatible for now
    ephemeral,
  };
  if (doesInteractionRequireFollowup(interaction)) {
    await interaction.followUp(messageContent);
  } else {
    await interaction.reply(messageContent);
  }
  const questionMessage = (await interaction.fetchReply()) as Discord.Message;
  const messageForTimeout = timeoutMessage || 'Cancelled due to timeout.';
  // only accept reactions from the user that created this question
  // eslint-disable-next-line max-len
  const filter = (intraction: MessageComponentInteraction) => intraction.user.id === interaction.member?.user.id
    && intraction.customId.startsWith(
      `${buttonInteractionId.confirmation}-${interaction.id}-`,
    );
  const collector = questionMessage.createMessageComponentCollector({
    filter,
    time: timeoutTime,
  });
  const promise = new Promise<MessageComponentInteraction | null>((resolve) => {
    let alreadyResolved = false;
    collector.once('collect', async (collectionInteraction) => {
      alreadyResolved = true;
      // load info of that button
      const idParts = collectionInteraction.customId.split('-');
      const isYesButton = idParts[2] === 'yes';

      if (!isYesButton) {
        await collectionInteraction.reply({
          content: abortMessage,
          ephemeral,
        });
      } else {
        await collectionInteraction.deferReply();
      }
      resolve(isYesButton ? collectionInteraction : null);
      collector.stop('Got an answer.');
    });
    collector.once('end', async () => {
      if (!alreadyResolved) {
        // await questionMessage.delete();
        interaction.followUp({
          content: messageForTimeout,
          ephemeral,
        });
        resolve(null);
      }
    });
  });
  return promise;
}
export function printError(error: {
  response: { status: string; statusText: string };
}) {
  console.error(
    `Errorstatus: ${error.response.status} ${error.response.statusText}`,
  );
}

export async function asyncForEach<T, F, O>(
  values: Array<T> | Discord.Collection<string | number, T>,
  callback: (
    input: T,
    index: number | string,
    optionalParams?: O
  ) => Promise<F>,
  optParams?: O,
) {
  if (Array.isArray(values)) {
    const arr = values.map((e, i) => callback(e, i, optParams));
    return Promise.all<F>(arr);
  }
  const arr = values.map((e, i) => callback(e, i, optParams));
  return Promise.all<F>(arr);
}

// unused
export async function asyncForEachFromFlint<T, F, N, O>(
  array: Array<T> | Map<N, T>,
  callback: (input: T, index: number | N, optParams?: O) => Promise<F>,
  optionalParams?: O,
) {
  if (Array.isArray(array)) {
    const arr = array.map((e, i) => callback(e, i, optionalParams));
    return Promise.all<F>(arr);
  }
  const arr: Array<Promise<F>> = [];
  array.forEach((e, i) => arr.push(callback(e, i, optionalParams)));
  return Promise.all<F>(arr);
}

export async function asyncWait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getUserMention(userId: string | null | undefined) {
  if (!userId) {
    return '';
  }
  return `<@${userId}>`;
}

export function getRoleMention(roleId: string) {
  return `<@&${roleId}>`;
}

export function getBotInviteUrl() {
  return `https://discord.com/api/oauth2/authorize?client_id=${
    user().id
  }&permissions=3212353&scope=bot%20applications.commands`;
}

export enum TimestampType {
  SHORT_TIME = 't',
  LONG_TIME = 'T',
  SHORT_DATE = 'd',
  LONG_DATE = 'D',
  SHORT_DATE_TIME = 'f',
  LONG_DATE_TIME = 'F',
  RELATIVE = 'R'
}

export function formatAsTimestamp(date: Date, type: TimestampType = TimestampType.SHORT_DATE_TIME) {
  let timestamp = date.getTime();
  timestamp /= 1000;
  timestamp = Math.floor(timestamp);
  return `<t:${timestamp}:${type}>`;
}
