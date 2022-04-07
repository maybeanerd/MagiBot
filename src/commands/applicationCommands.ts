import { ping } from './ping';
import { roll } from './roll';
import { invite } from './invite';
import { bugreport } from './bug';
import { randomfact } from './rfact';
import { salt } from './salt';
import { profile } from './profile';
import { admin } from './admin/adminApplicationCommands';
import { MagibotSlashCommand } from '../types/command';

export const applicationCommands: { [k: string]: MagibotSlashCommand } = {
	ping,
	roll,
	invite,
	bugreport,
	randomfact,
	salt,
	profile,

	// all admin commands
	admin,
};
