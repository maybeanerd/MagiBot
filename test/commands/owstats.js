const axios = require('axios');
const bamands = require(`${__dirname}/../bamands.js`);

const regions = { us: 'us', eu: 'eu', asia: 'asia' };
const platforms = { pc: 'pc' }; // TODO others

module.exports = {
  main: async (bot, msg) => {
    const args = msg.content.split(/ +/);
    let region;
    if (args[0]) {
      region = args[0].toLowerCase();
    } else {
      msg.reply(`You need to specify the region you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    if (!regions[region]) {
      msg.reply(`You need to specify a correct region you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    let platform;
    if (args[1]) {
      platform = args[1].toLowerCase();
    } else {
      msg.reply(`You need to specify the platform you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    if (!platforms[platform]) {
      msg.reply(`You need to specify a correct platform you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    let userName;
    if (args[2]) {
      userName = args[2].toLowerCase();
    }
    const battletag = userName.msg.content.split(/#/)[1];
    if (!battletag) {
      return;
    }
    userName = userName.substr(0, userName.msg.content.split(/#/)[0].length);
    const info = [];

    let data = await axios.get(`https://ow-api.com/v1/stats/${platform}/${region}/${userName}-${battletag}/heroes/`).catch(bamands.catchError);
    if (data && data.data) {
      data = data.data;
    } else {
      msg.channel.send(`There seems no player named${userName} exists in the ${region} region on ${platform}.`);
      return;
    }
    info.push({
      name: `Player: ${data.name}, Lv. ${data.level} prestige ${data.prestige}`,
      value: `Rating: **${data.rating}**, won ${data.gamesWon} games`,
      inline: false
    });

    // Get ranking


    const embed = {
      color: bot.COLOR,
      fields: info,
      thumbnail: { url: data.ratingIcon },
      footer: {
        /* eslint-disable camelcase*/
        icon_url: 'http://www.stickpng.com/assets/images/586273b931349e0568ad89df.png',
        /* eslint-enable camelcase*/
        text: 'powered by ow-api.com'
      }
    };

    msg.channel.send({ embed });
  },
  ehelp(msg, bot) {
    const ret = [];
    ret.push({
      name: '<region> <platform> <playerName>#<playerTag>',
      value: `Get the Overwatch stats about a certain user.\nAn example would be: \`${bot.PREFIXES[msg.guild.id]}.owstats eu pc MyUserName#myTag\`\n\n**Possible region parameters:**\neu, us, asia\n**Possible platform parameters:**\npc`
    });
    return ret;
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Games' // TODO add this to the categories
};

