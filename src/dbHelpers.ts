import {
  ConfigurationModel,
  UserModel,
  Configuration,
  SaltrankModel,
  StillMutedModel,
  GlobalUserDataModel,
} from './db';
import { PREFIXES } from './shared_assets';
import config from './configuration';
import { sendJoinEvent } from './webhooks';

export async function getUser(userid: string, guildID: string) {
  const result = await UserModel.findOneAndUpdate(
    {
      userID: userid,
      guildID,
    },
    {
      $setOnInsert: {
        warnings: 0,
        kicks: 0,
        bans: 0,
        botusage: 0,
        sound: undefined,
      },
    },
    {
      returnOriginal: false,
      upsert: true,
    },
  );
  return result;
}

export async function getGlobalUser(userId: string) {
  const result = await GlobalUserDataModel.findOneAndUpdate(
    {
      userID: userId,
    },
    {
      $setOnInsert: {
        sound: undefined,
      },
    },
    {
      returnOriginal: false,
      upsert: true,
    },
  );
  return result;
}

export async function removeAllJoinsoundsOfUserFromDb(userId: string) {
  await UserModel.updateMany(
    { userID: userId },
    { $unset: { sound: 1, soundTitle: 1 } },
  );
  await GlobalUserDataModel.updateMany(
    { userID: userId },
    { $unset: { sound: 1, soundTitle: 1 } },
  );
}

async function createFirstConfiguration(guildID: string) {
  const configuration = new ConfigurationModel({
    _id: guildID,
    commandChannels: [],
    adminRoles: [],
    joinChannels: [],
    saltKing: undefined,
    saltRole: undefined,
    prefix: config.prefix,
    lastConnected: new Date(),
    defaultJoinsound: undefined,
  });
  await configuration.save();
  return configuration;
}

export async function getConfiguration(guildID: string) {
  let result = await ConfigurationModel.findById(guildID);
  if (!result) {
    await sendJoinEvent(
      `:wastebasket: couldn't find configuration for guild ${guildID} , resetting/setting empty state. Found this:${JSON.stringify(
        result,
        null,
        2,
      )}`,
    );

    result = await createFirstConfiguration(guildID);
  }
  return result;
}

export async function checkGuild(id: string) {
  // create configuration
  if (await getConfiguration(id)) {
    return true;
  }
  return false;
}

export async function setConfiguration(
  guildID: string,
  // this was difficult to find, but is awesome
  update: { [Property in keyof Configuration]?: Configuration[Property] },
) {
  if (await getConfiguration(guildID)) {
    await ConfigurationModel.updateOne({ _id: guildID }, { $set: update });
  }
  return true;
}

// top 5 salty people
export async function topSalt(guildID: string) {
  const result = await SaltrankModel.find({ guild: guildID })
    .sort({ salt: -1 })
    .limit(5);
  if (!result) {
    return [];
  }
  return result;
}

export async function isJoinableVc(guildID: string, channelID: string) {
  const configuration = await getConfiguration(guildID);
  return (
    configuration.joinChannels.length === 0
    || configuration.joinChannels.includes(channelID)
  );
}

export async function setPrefix(guildID: string, prefix: string) {
  const success = await setConfiguration(guildID, {
    prefix,
  });
  if (success) {
    PREFIXES.set(guildID, prefix);
  }
  return success;
}

export async function getPrefix(guildID: string) {
  const configuration = await getConfiguration(guildID);
  const { prefix } = configuration;
  if (!prefix) {
    await setPrefix(guildID, config.prefix);
    return config.prefix;
  }
  return prefix;
}

export async function toggleStillMuted(
  userID: string,
  guildID: string,
  add: boolean,
) {
  if (add) {
    const isStillMutedAmount = await StillMutedModel.find({
      userid: userID,
      guildid: guildID,
    }).count();
    if (isStillMutedAmount === 0) {
      const newMute = new StillMutedModel({
        userid: userID,
        guildid: guildID,
      });
      await newMute.save();
    }
  } else {
    await StillMutedModel.deleteMany({
      userid: userID,
      guildid: guildID,
    });
  }
}

export async function getCommandChannels(guildID: string) {
  const configuration = await getConfiguration(guildID);
  return configuration.commandChannels;
}
