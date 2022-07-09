import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import {
  CommandInteraction,
  EmbedFieldData,
  MessageAttachment,
  MessageEmbedOptions,
  User,
} from 'discord.js';
import { getGlobalUser, getConfiguration, getUser } from '../../dbHelpers';
import {
  getJoinsoundReadableStreamOfUser,
  JoinsoundStoreError,
  removeLocallyStoredJoinsoundOfTarget,
  storeJoinsoundOfTarget,
  getSpaceUsedByTarget,
  joinsoundStorageUserLimit,
  getAllLocallyStoredJoinsoundsOfUser,
} from './fileManagement';
import { asyncForEach, interactionConfirmation } from '../../helperFunctions';
import { DeferReply } from '../../types/command';

// eslint-disable-next-line no-shadow
export const enum JoinsoundOptions {
  'soundFile' = 'sound-file',
  'directUrl' = 'direct-url',
  'user' = 'user',
}

async function setSound(
  userId: string,
  guildId: string,
  soundUrl: string | undefined,
  locallyStored: boolean,
): Promise<JoinsoundStoreError | null> {
  const user = await getUser(userId, guildId);
  if (!locallyStored) {
    user.sound = soundUrl;
    await removeLocallyStoredJoinsoundOfTarget({ userId, guildId });
  } else if (soundUrl) {
    user.sound = 'local';
    const error = await storeJoinsoundOfTarget({ userId, guildId }, soundUrl);
    if (error) {
      return error;
    }
  } else {
    user.sound = undefined;
    await removeLocallyStoredJoinsoundOfTarget({ userId, guildId });
  }
  await user.save();
  return null;
}

export async function removeSound(userId: string, guildId: string) {
  return setSound(userId, guildId, undefined, true);
}

async function setDefaultSound(
  userId: string,
  soundUrl: string | undefined,
  locallyStored: boolean,
): Promise<JoinsoundStoreError | null> {
  const user = await getGlobalUser(userId);

  if (!locallyStored) {
    user.sound = soundUrl;
    await removeLocallyStoredJoinsoundOfTarget({ userId, default: true });
  } else if (soundUrl) {
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

  await user.save();
  return null;
}

export async function removeDefaultSound(userId: string) {
  return setDefaultSound(userId, undefined, true);
}

async function setDefaultGuildJoinsound(
  guildId: string,
  soundUrl: string | undefined,
  locallyStored: boolean,
): Promise<JoinsoundStoreError | null> {
  const guild = await getConfiguration(guildId);

  if (!locallyStored) {
    guild.defaultJoinsound = soundUrl;
    await removeLocallyStoredJoinsoundOfTarget({ guildId, default: true });
  } else if (soundUrl) {
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

  await guild.save();
  return null;
}

export async function removeDefaultGuildJoinsound(guildId: string) {
  return setDefaultGuildJoinsound(guildId, undefined, true);
}

export async function validateAndSaveJoinsound(
  attachmentOrUrl: MessageAttachment | string,
  interaction: CommandInteraction,
  setDefault: boolean,
  user?: User,
  defaultForGuildId?: string,
) {
  if (setDefault && user) {
    throw new Error('Cant set-default sounds for others!');
  }

  let soundUrl: string;
  let locallyStored = true;
  if (typeof attachmentOrUrl === 'string') {
    soundUrl = attachmentOrUrl;
    locallyStored = false;
  } else {
    const isAudioFile = attachmentOrUrl.contentType?.startsWith('audio/');
    if (!isAudioFile) {
      interaction.followUp('The file you sent is not an audio file!');
      return;
    }
    soundUrl = attachmentOrUrl.url;
  }

  const sound = await ffprobe(soundUrl, { path: ffprobeStatic.path }).catch(
    () => {},
  );
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
  if (!firstStream.duration) {
    interaction.followUp(
      "Failed to calculate the duration of the joinsound you're trying to add.",
    );
    return;
  }
  if (firstStream.duration > 8) {
    interaction.followUp(
      "The joinsound you're trying to add is longer than 8 seconds.",
    );
    return;
  }

  const userId = user ? user.id : interaction.member!.user.id;

  let error: JoinsoundStoreError | null;

  if (defaultForGuildId) {
    error = await setDefaultGuildJoinsound(
      defaultForGuildId,
      soundUrl,
      locallyStored,
    );
  } else if (setDefault) {
    error = await setDefaultSound(userId, soundUrl, locallyStored);
  } else {
    error = await setSound(
      userId,
      interaction.guild!.id,
      soundUrl,
      locallyStored,
    );
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
  confirmed.followUp('Successfully removed all of your joinsounds!');
}

export async function getJoinsoundOverviewOfUser(
  interaction: CommandInteraction,
) {
  const { user } = interaction.member!;
  const userId = user.id;
  const guild = interaction.guild!;
  const guildId = guild.id;

  const member = await guild.members.fetch(userId)!;

  const defaultJoinsound = (await getGlobalUser(userId)).sound;
  const guildJoinsound = (await getUser(userId, guildId)).sound;
  const storageUsed = await getSpaceUsedByTarget({ userId, guildId });

  const info: Array<EmbedFieldData> = [];

  info.push({
    name: 'Default Joinsound',
    value: defaultJoinsound ? 'Yes' : 'None',
    inline: false,
  });

  info.push({
    name: 'Joinsound on this Guild',
    value: guildJoinsound ? 'Yes' : 'None',
    inline: false,
  });
  info.push({
    name: 'Storage Used by Joinsounds',
    value: `**${(storageUsed / 1024).toFixed(1)} KB** / ${
      joinsoundStorageUserLimit / 1024
    } KB`,
    inline: false,
  });

  const embed: MessageEmbedOptions = {
    color: member.displayColor,
    description: `Joinsound overview of ${user}:`,
    fields: info,
    thumbnail: { url: member.user.avatarURL() || '' },
    footer: {
      iconURL: member.user.avatarURL() || '',
      text: member.user.tag,
    },
  };

  interaction.followUp({ embeds: [embed] });
}
