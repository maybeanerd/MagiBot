import { ping } from './ping';
import { roll } from './roll';
import { invite } from './invite';
import { bugreport } from './bug';
import { randomfact } from './rfact';
import { salt } from './salt';
import { profile } from './profile';
import { joinsound } from './joinsound';
import { info } from './info';
import { vote } from './vote';
import { help } from './help';
import { queue } from './queue';
import { admin } from './admin/adminApplicationCommands';
import { MagibotSlashCommand } from '../types/command';

export const globalApplicationCommands: { [k: string]: MagibotSlashCommand } = {
  ping,
  roll,
  invite,
  bugreport,
  randomfact,
  salt,
  profile,
  joinsound,
  info,
  vote,
  help,
  queue,

  // all admin commands
  admin,
};

export const guildApplicationCommands: { [k: string]: MagibotSlashCommand } = {
  // TODO do we ever need this?
};
