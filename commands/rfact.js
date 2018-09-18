const axios = require('axios');

const options = { weekday: 'long', month: 'long', day: 'numeric' };

module.exports = {
  main: async (bot, msg) => {
    const now = new Date();
    let fact = await axios.get(`http://numbersapi.com/${now.getMonth() + 1}/${now.getDate()}/date`);
    fact = fact.data;

    if (!fact) {
      msg.channel.send('Something went wrong whilst contacting the API...');
      return;
    }
    const embed = {
      color: bot.COLOR,
      // fields: info,
      title: `Random fact about: \`${now.toLocaleDateString('en-US', options)}\``,
      description: fact,
      footer: {
        /* eslint-disable camelcase*/
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase*/
        text: 'powered by numbersapi.com'
      }
    };

    msg.channel.send({ embed });
  },
  ehelp() {
    return [{ name: '', value: 'Get a random fact about the current date.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Fun'
};

