
// we allow this cycle once, as the help command also needs to list itself
import { help } from './commands/help'; // eslint-disable-line import/no-cycle

export const commands:{[k:string]:magibotCommand} = {
  help,
};
