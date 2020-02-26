import axios from 'axios';
import { commandCategories } from '../types/enums';
import { COLOR, user } from '../shared_assets';


const options = { weekday: 'long', month: 'long', day: 'numeric' };

export const rfact: magibotCommand = {
  main: async (content, msg) => {
    const now = new Date();
    let fact = await axios.get(`http://numbersapi.com/${now.getMonth() + 1}/${now.getDate()}/date`);
    fact = fact.data;


    if (!fact) {
      msg.channel.send('Something went wrong whilst contacting the API...');
      return;
    }
    const embed = {
      color: COLOR,
      // fields: info,
      title: `Random fact about: \`${now.toLocaleDateString('en-US', options)}\``,
      description: fact,
      footer: {
        /* eslint-disable camelcase */
        icon_url: user().avatarURL,
        /* eslint-enable camelcase */
        text: 'powered by numbersapi.com',
      },
    };

    msg.channel.send({ embed });
  },
  ehelp() {
    return [{ name: '', value: 'Get a random fact about the current date.' }];
  },
  help: 'Get a random fact about the current date.',
  name: 'rfact',
  dev: false,
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: commandCategories.fun,
};
