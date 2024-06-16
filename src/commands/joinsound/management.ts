import ffprobe from 'ffprobe';
import { CommandInteraction, Attachment, User } from 'discord.js';
import { APIEmbed, APIEmbedField } from 'discord-api-types/v10';
import {
  getGlobalUser,
  getConfiguration,
  getUser,
  removeAllJoinsoundsOfUserFromDb,
  getUserInAllGuilds,
} from '../../dbHelpers';
import {
  getJoinsoundReadableStreamOfUser,
  JoinsoundStoreError,
  removeLocallyStoredJoinsoundOfTarget,
  storeJoinsoundOfTarget,
  getSpaceUsedByTarget,
  joinsoundStorageUserLimit,
  getAllLocallyStoredJoinsoundsOfUser,
  maximumSingleFileSize,
} from './fileManagement';
import { asyncForEach, interactionConfirmation } from '../../helperFunctions';
import { DeferReply } from '../../types/command';
import { globalUser, User as UserInDb } from '../../db';

// eslint-disable-next-line no-shadow
export const enum JoinsoundOptions {
  'soundFile' = 'sound-file',
  'user' = 'user',
}

const maxJoinsoundTitleCharlength = 30;

function getSoundTitleFromUrl(url?: string) {
  return url
    ? url
      .substring(url.lastIndexOf('/') + 1)
      .substring(0, maxJoinsoundTitleCharlength) // enforce max length
    : undefined;
}

async function setSound(
  userId: string,
  guildId: string,
  soundUrl: string | undefined,
): Promise<JoinsoundStoreError | null> {
  const user = await getUser(userId, guildId);
  if (soundUrl) {
    user.sound = 'local';
    const error = await storeJoinsoundOfTarget({ userId, guildId }, soundUrl);
    if (error) {
      return error;
    }
  } else {
    user.sound = undefined;
    await removeLocallyStoredJoinsoundOfTarget({ userId, guildId });
  }

  user.soundTitle = getSoundTitleFromUrl(soundUrl);
  await user.save();
  return null;
}

export async function removeSound(userId: string, guildId: string) {
  return setSound(userId, guildId, undefined);
}

async function setDefaultSound(
  userId: string,
  soundUrl: string | undefined,
): Promise<JoinsoundStoreError | null> {
  const user = await getGlobalUser(userId);

  if (soundUrl) {
    user.sound = 'local';
    const error = await storeJoinsoundOfTarget(
      { userId, default: true },
      soundUrl,
    );
    if (error) {
      return error;
    }
  } else {
    user.sound = undefined;
    await removeLocallyStoredJoinsoundOfTarget({ userId, default: true });
  }

  user.soundTitle = getSoundTitleFromUrl(soundUrl);
  await user.save();
  return null;
}

export async function removeDefaultSound(userId: string) {
  return setDefaultSound(userId, undefined);
}

async function setDefaultGuildJoinsound(
  guildId: string,
  soundUrl: string | undefined,
): Promise<JoinsoundStoreError | null> {
  const guild = await getConfiguration(guildId);

  if (soundUrl) {
    guild.defaultJoinsound = 'local';
    const error = await storeJoinsoundOfTarget(
      { guildId, default: true },
      soundUrl,
    );
    if (error) {
      return error;
    }
  } else {
    guild.defaultJoinsound = undefined;
    await removeLocallyStoredJoinsoundOfTarget({ guildId, default: true });
  }

  guild.defaultJoinsoundTitle = getSoundTitleFromUrl(soundUrl);
  await guild.save();
  return null;
}

export async function removeDefaultGuildJoinsound(guildId: string) {
  return setDefaultGuildJoinsound(guildId, undefined);
}

const defaultFFProbeLocation = '/usr/bin/ffprobe';

export async function validateAndSaveJoinsound(
  attachment: Attachment,
  interaction: CommandInteraction,
  setDefault: boolean,
  user?: User,
  defaultForGuildId?: string,
) {
  if (setDefault && user) {
    throw new Error('Cant set-default sounds for others!');
  }

  const isAudioFile = attachment.contentType?.startsWith('audio/');
  if (!isAudioFile) {
    interaction.followUp('The file you sent is not an audio file!');
    return;
  }
  if (attachment.size > maximumSingleFileSize) {
    interaction.followUp(
      `The file you sent is larger than ${
        maximumSingleFileSize / 1024
      } KB, which is the limit per file!`,
    );
    return;
  }
  const soundUrl = attachment.url;

  const sound = await ffprobe(soundUrl, {
    path: defaultFFProbeLocation,
  }).catch((error) => {
    console.error(error);
  });

  if (!sound) {
    interaction.followUp(
      'Something went wrong when trying to load your file. Make sure the URL links directly to an audio file.',
    );
    return;
  }
  // eslint-disable-next-line prefer-destructuring
  const firstStream = sound.streams[0];
  if (
    firstStream
    && firstStream.codec_name !== 'mp3'
    && firstStream.codec_name !== 'pcm_s16le'
    && firstStream.codec_name !== 'pcm_f32le'
  ) {
    interaction.followUp(
      'You need to use a compatible file! For more info use `help sound`',
    );
    return;
  }
  const duration = firstStream.duration ? Number(firstStream.duration) : null;
  if (!duration || Number.isNaN(duration)) {
    interaction.followUp(
      "Failed to calculate the duration of the joinsound you're trying to add.",
    );
    return;
  }
  if (duration > 8) {
    interaction.followUp(
      "The joinsound you're trying to add is longer than 8 seconds.",
    );
    return;
  }

  const userId = user ? user.id : interaction.member!.user.id;

  let error: JoinsoundStoreError | null;

  if (defaultForGuildId) {
    error = await setDefaultGuildJoinsound(defaultForGuildId, soundUrl);
  } else if (setDefault) {
    error = await setDefaultSound(userId, soundUrl);
  } else {
    error = await setSound(userId, interaction.guild!.id, soundUrl);
  }
  if (error) {
    if (error === JoinsoundStoreError.noStorageLeftForUser) {
      interaction.followUp(
        `**You already have more than 1MB (1 MegaByte) worth of joinsounds!**
In general this is enough to store about 5 different joinsounds.
To add new joinsounds you either need to delete some of your old ones, or upload your new ones using the direct-url option, since that will not count towards your storage limit.`,
      );
      return;
    }
    if (error === JoinsoundStoreError.noStorageLeftForGuild) {
      interaction.followUp(
        `**You can't use a joinsound that is larger than 500KB (500 KiloBytes)!**
This limit only applies to default joinsounds of guilds. A typical sound will need about 50-200 KB, so it should be no problem to fit within this limit.`,
      );
      return;
    }
    if (error === JoinsoundStoreError.noStorageLeftOnServer) {
      interaction.followUp(
        'This is embarassing. It seems like the server has reached its maximum storage capacity. Feel free to notify the developers about this by using `/bugreport` or on the discord server found in `/info`.',
      );
      return;
    }
  }
  if (defaultForGuildId) {
    interaction.followUp(
      'You successfully changed the default joinsound for this server!',
    );
    return;
  }
  if (user) {
    interaction.followUp(`You successfully changed ${user}s joinsound!`);
    return;
  }
  interaction.followUp(
    `You successfully changed your ${setDefault ? 'default ' : ''}joinsound!`,
  );
}

export async function getJoinsoundOfUser(userId: string, guildId: string) {
  const user = await getUser(userId, guildId);
  if (user.sound && user.sound !== 'false') {
    if (user.sound === 'local') {
      return getJoinsoundReadableStreamOfUser({ userId, guildId });
    }
    return user.sound;
  }
  const defaultUser = await getGlobalUser(userId);
  if (defaultUser.sound && defaultUser.sound !== 'false') {
    if (defaultUser.sound === 'local') {
      return getJoinsoundReadableStreamOfUser({ userId, default: true });
    }
    return defaultUser.sound;
  }
  const defaultGuildSound = await getConfiguration(guildId);
  if (
    defaultGuildSound.defaultJoinsound
    && defaultGuildSound.defaultJoinsound !== 'false'
  ) {
    if (defaultGuildSound.defaultJoinsound === 'local') {
      return getJoinsoundReadableStreamOfUser({ guildId, default: true });
    }
    return defaultGuildSound.defaultJoinsound;
  }
  return null;
}

export async function removeAllJoinsoundsOfUser(
  interaction: CommandInteraction,
  deferralType: DeferReply,
) {
  const confirmed = await interactionConfirmation(
    interaction,
    'Are you sure you want to remove all of your joinsounds?',
    deferralType,
    'Cancelled removing all of your joinsounds.',
  );
  if (!confirmed) {
    return;
  }

  const userId = interaction.member!.user.id;
  const guildIds = await getAllLocallyStoredJoinsoundsOfUser(userId);
  await asyncForEach(guildIds, async (guildId) => {
    await removeSound(userId, guildId);
  });
  await removeDefaultSound(userId);
  // remove all sounds that were not locally stored as well
  await removeAllJoinsoundsOfUserFromDb(userId);
  confirmed.followUp('Successfully removed all of your joinsounds!');
}

function getJoinsoundOfUserEntry(user: UserInDb | globalUser) {
  if (user.soundTitle) {
    return user.soundTitle;
  }
  if (user.sound) {
    return user.sound.slice(-30);
  }
  return false;
}

const defaultJoinsoundValue = 'None set.';
const maxEmbedCharacters = 4096;

export async function getJoinsoundOverviewOfUser(
  interaction: CommandInteraction,
) {
  const { user } = interaction.member!;
  const userId = user.id;
  const guild = interaction.guild!;
  const guildId = guild.id;

  const member = await guild.members.fetch(userId)!;

  const defaultUser = await getGlobalUser(userId);
  // get user for this guild extra as this will create the user entry if it doesn't exist
  const userInThisGuild = await getUser(userId, guildId);
  const userInAllGuilds = await getUserInAllGuilds(userId);
  const storageUsed = await getSpaceUsedByTarget({ userId, guildId });

  const info: Array<APIEmbedField> = [];

  info.push({
    name: 'Storage Used by Joinsounds',
    value: `**${(storageUsed / 1024).toFixed(1)} KB** / ${
      joinsoundStorageUserLimit / 1024
    } KB`,
    inline: false,
  });

  info.push({
    name: 'Default Joinsound',
    value: getJoinsoundOfUserEntry(defaultUser) || defaultJoinsoundValue,
    inline: false,
  });

  info.push({
    name: 'Joinsound on this guild',
    value: getJoinsoundOfUserEntry(userInThisGuild) || defaultJoinsoundValue,
    inline: false,
  });

  let soundNames = '';
  userInAllGuilds.forEach((userEntry) => {
    if (userEntry.guildID === guildId) {
      return;
    }
    const soundName = getJoinsoundOfUserEntry(userEntry);
    if (soundName) {
      soundNames += `${soundName}\n`;
    }
  });

  info.push({
    name: 'Joinsounds on other guilds',
    value: (soundNames || defaultJoinsoundValue).slice(0, maxEmbedCharacters),
    inline: false,
  });

  const embed: APIEmbed = {
    color: member.displayColor,
    description: `Joinsound overview of ${user}:`,
    fields: info,
    thumbnail: { url: member.user.avatarURL() || '' },
    footer: {
      icon_url: member.user.avatarURL() || '',
      text: member.user.tag,
    },
  };

  interaction.followUp({ embeds: [embed] });
}
