import mongoose from 'mongoose';
import config from './configuration';

if (!config.dburl) {
  throw new Error('Missing DB connection URL');
}
const url = config.dburl;

mongoose.connect(`${url}/MagiBot`, {
  ssl: true,
});

// const mongooseConnction = mongoose.connection;

// define types and Models of DB. later on we will move them out of here and just import them
// settings per guild
export type Settings = {
  _id: string;
  commandChannels: Array<string>;
  adminRoles: Array<string>;
  joinChannels: Array<string>;
  blacklistedUsers: Array<string>;
  blacklistedEveryone: Array<string>;
  saltKing?: string;
  saltRole?: string;
  notChannel?: string;
  prefix: string;
  lastConnected: Date;
  defaultJoinsound?: string;
};
const settingsSchema = new mongoose.Schema<Settings>(
  {
    _id: {
      // _id is auto indexed and unique
      type: String,
      required: true,
    },
    commandChannels: {
      type: [String],
      required: true,
    },
    adminRoles: {
      type: [String],
      required: true,
    },
    joinChannels: {
      type: [String],
      required: true,
    },
    blacklistedUsers: {
      type: [String],
      required: true,
    },
    blacklistedEveryone: {
      type: [String],
      required: true,
    },
    saltKing: {
      type: String,
      required: false,
    },
    saltRole: {
      type: String,
      required: false,
    },
    notChannel: {
      type: String,
      required: false,
    },
    prefix: {
      type: String,
      required: true,
    },
    lastConnected: {
      type: Date,
      required: true,
    },
    defaultJoinsound: {
      type: String,
      required: false,
    },
  },
  { collection: 'settings' },
);
export const SettingsModel = mongoose.model<Settings>(
  'settings',
  settingsSchema,
);

// saltrank per user
type Saltrank = { salter: string; salt: number; guild: string };
const saltrankSchema = new mongoose.Schema<Saltrank>(
  {
    salter: {
      type: String,
      required: true,
    },
    salt: {
      type: Number,
      required: true,
    },
    guild: {
      type: String,
      required: true,
    },
  },
  { collection: 'saltrank' },
);
saltrankSchema.index(
  {
    salter: 1,
    guild: -1,
  },
  { unique: true },
);
export const SaltrankModel = mongoose.model<Saltrank>(
  'saltrank',
  saltrankSchema,
);

// salt reports per report
type Salt = {
  salter: string;
  reporter: string;
  date: Date;
  guild: string;
};
const saltSchema = new mongoose.Schema<Salt>(
  {
    salter: {
      type: String,
      required: true,
    },
    reporter: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    guild: {
      type: String,
      required: true,
      index: true,
    },
  },
  { collection: 'salt' },
);
saltSchema.index({
  salter: 1,
  reporter: -1,
});
export const SaltModel = mongoose.model<Salt>('salt', saltSchema);

// userdata per user per guild
type User = {
  userID: string;
  guildID: string;
  warnings: number;
  kicks: number;
  bans: number;
  botusage: number;
  sound?: string;
};
const userSchema = new mongoose.Schema<User>(
  {
    userID: {
      type: String,
      required: true,
    },
    guildID: {
      type: String,
      required: true,
    },
    warnings: {
      type: Number,
      required: true,
    },
    kicks: {
      type: Number,
      required: true,
    },
    bans: {
      type: Number,
      required: true,
    },
    botusage: {
      type: Number,
      required: true,
    },
    sound: {
      type: String,
      required: false,
    },
  },
  { collection: 'users' },
);
userSchema.index(
  {
    userID: 1,
    guildID: -1,
  },
  { unique: true },
);
export const UserModel = mongoose.model<User>('users', userSchema);

const deleteDuplicateUsers = true;
UserModel.aggregate([
  {
    $group: {
      _id: {
        userID: '$userID',
        guildID: '$guildID',
      },
      count: {
        $sum: 1,
      },
    },
  },
]).then((duplicateUsers) => {
  console.log(
    'duplicate users:',
    JSON.stringify(
      duplicateUsers.filter((u) => u.count > 1),
      null,
      2,
    ),
  );
  if (deleteDuplicateUsers) {
    duplicateUsers
      .filter((u) => u.count > 1)
      .forEach(async (u) => {
        for (let i = 1; i < u.count; i++) {
          // eslint-disable-next-line no-underscore-dangle, no-await-in-loop
          await UserModel.deleteOne(u._id);
          // eslint-disable-next-line no-underscore-dangle
          console.log('Deleted user', u._id, 'run', i, 'of', u.count - 1);
        }
      });
  }
});

// global/default values for a specific user
type globalUser = {
  userID: string;
  sound?: string;
};
const globalUserSchema = new mongoose.Schema<globalUser>(
  {
    userID: {
      type: String,
      required: true,
    },
    sound: {
      type: String,
      required: false,
    },
  },
  { collection: 'globalUsers' },
);
globalUserSchema.index(
  {
    userID: 1,
  },
  { unique: true },
);
export const GlobalUserDataModel = mongoose.model<globalUser>(
  'globalUsers',
  globalUserSchema,
);

// entry per vote
export type Vote = {
  messageID: string;
  channelID: string;
  options: Array<string>;
  topic: string;
  date: Date;
  guildid: string;
  authorID: string;
};
const voteSchema = new mongoose.Schema<Vote>(
  {
    messageID: {
      type: String,
      required: true,
    },
    channelID: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    guildid: {
      type: String,
      required: true,
    },
    authorID: {
      type: String,
      required: true,
    },
  },
  { collection: 'votes' },
);
voteSchema.index({
  messageID: 1,
  channelID: 1,
});
export const VoteModel = mongoose.model<Vote>('votes', voteSchema);

type OngoingQueue = {
  guildId: string;
  interactionId: string;
  topic: string;
  endDate: Date;
  queuedUsers: Array<string>;
};
const ongoingQueueSchema = new mongoose.Schema<OngoingQueue>(
  {
    guildId: {
      type: String,
      required: true,
    },
    interactionId: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    queuedUsers: {
      type: [String],
      required: true,
    },
  },
  { collection: 'ongoingQueue' },
);
ongoingQueueSchema.index({
  guildId: 1, interactionId: 1, endDate: 1,
});
export const OngoingQueueModel = mongoose.model<OngoingQueue>(
  'ongoingQueue',
  ongoingQueueSchema,
);

// one entry per user per guild
// deprecated, we want to remove this system?
type StillMuted = { userid: string; guildid: string };
const stillMutedSchema = new mongoose.Schema<StillMuted>(
  {
    userid: {
      type: String,
      required: true,
    },
    guildid: {
      type: String,
      required: true,
    },
  },
  { collection: 'stillMuted' },
);
stillMutedSchema.index({
  userid: 1,
  guildid: 1,
});
export const StillMutedModel = mongoose.model<StillMuted>(
  'stillMuted',
  stillMutedSchema,
);
