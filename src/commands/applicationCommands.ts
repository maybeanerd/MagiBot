import { ping } from './ping';
import { roll } from './roll';
import { invite } from './invite';
import { bugreport } from './bug';
import { randomfact } from './rfact';
import { magibotCommand } from '../types/command';

export const applicationCommands: { [k: string]: magibotCommand } = {
	ping,
	roll,
	invite,
	bugreport,
	randomfact,
};
