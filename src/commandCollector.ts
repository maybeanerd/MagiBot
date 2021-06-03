import { help } from './commands/help';
import { magibotCommand } from './types/magibot';

export const commands: { [k: string]: magibotCommand } = {
	help,
};
