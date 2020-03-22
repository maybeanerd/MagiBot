const axios = require('axios');
const bamands = require(`${__dirname}/../bamands.js`);

const regions = { us: 'us', eu: 'eu', asia: 'asia' };
const platforms = { pc: 'pc', psn: 'psn', xbl: 'xbl' };
const herolist = 'bastion,dVa,genji,hanzo,junkrat,lúcio,mccree,mei,mercy,orisa,pharah,reaper,reinhardt,roadhog,soldier76,sombra,symmetra,torbjörn,tracer,widowmaker,winston,zarya,zenyatta';

module.exports = {
  main: async (bot, msg) => {
    const args = msg.content.split(/ +/);
    let region;
    if (args[0]) {
      region = args[0].toLowerCase();
    } else {
      msg.reply(`you need to specify the region you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    region = regions[region];
    if (!region) {
      msg.reply(`you need to specify a region you want to search correctly. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    let platform;
    if (args[1]) {
      platform = args[1].toLowerCase();
    } else {
      msg.reply(`you need to specify the platform you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    platform = platforms[platform];
    if (!platform) {
      msg.reply(`you need to specify a platform you want to search correctly. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    let userName;
    if (args[2]) {
      userName = args[2];
    } else {
      msg.reply(`you need to specify the player you want to search. To get an example use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    const battletag = userName.split(/#/)[1];
    if (!battletag) {
      msg.reply(`you need to specify the player you want to search correctly. To get an example use \`${bot.PREFIXES[msg.guild.id]}.help owstats\``);
      return;
    }
    userName = userName.substr(0, userName.split(/#/)[0].length);
    const info = [];

    let data = await axios.get(`https://ow-api.com/v1/stats/${platform}/${region}/${userName}-${battletag}/heroes/${herolist}`).catch(bamands.printError);
    if (data && data.data && data.data.name) {
      data = data.data;
    } else {
      msg.reply(`there seems no player named ${userName} exists in the ${region} region on ${platform}.`);
      return;
    }
    let val;
    let iconURL = data.ratingIcon;
    if (data.rating) {
      val = `Rating: **${data.rating}**, won ${data.gamesWon} games`;
    } else {
      val = `No ranking available for ${userName}#${battletag}`;
      iconURL = data.icon;
    }
    info.push({
      name: `${data.name}, Lv. ${data.prestige}${data.level}`,
      value: val,
      inline: false
    });

    // Get ranking TODO top heroes, emoji medals
    let qps = data.quickPlayStats;
    val = `Games played: ${qps.games.played}, won: ${qps.games.won} (${Math.round((qps.games.won / qps.games.played) * 100)} %)
     Awards:
     cards: ${qps.awards.cards}, medals: ${qps.awards.medals} (${qps.awards.medalsGold} Gold, ${qps.awards.medalsSilver} Silver, ${qps.awards.medalsBronze} Bronze)`;
    if (!(qps.games.played || qps.games.won)) {
      val = `No quickplay stats available for ${userName}#${battletag}`;
    }
    info.push({
      name: 'Quickplay:',
      value: val,
      inline: false
    });
    qps = data.competitiveStats;
    val = `Games played: ${qps.games.played}, won: ${qps.games.won} (${Math.round((qps.games.won / qps.games.played) * 100)} %)
    Awards:
    cards: ${qps.awards.cards}, medals: ${qps.awards.medals} (${qps.awards.medalsGold} Gold, ${qps.awards.medalsSilver} Silver, ${qps.awards.medalsBronze} Bronze)`;
    if (!(qps.games.played || qps.games.won)) {
      val = `No ranking stats available for ${userName}#${battletag}`;
    }
    info.push({
      name: 'Competitive:',
      value: val,
      inline: false
    });
    info.push({
      name: 'Disclaimer:',
      value: 'Since Blizzard made Overwatch profiles private the API is not really supported anymore, so values might be empty. We hope that there will be a better alternative in the future.',
      inline: false
    });

    const embed = {
      color: bot.COLOR,
      fields: info,
      thumbnail: { url: iconURL },
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
      value: `Get the Overwatch stats about a certain user.\nAn example would be: \`${bot.PREFIXES[msg.guild.id]}.owstats eu pc MyUserName#myTag\`\n\n**Possible region parameters:**\neu, us, asia\n**Possible platform parameters:**\npc, psn, xbl`
    });
    return ret;
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Game'
};

