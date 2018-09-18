const axios = require('axios');
const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
const apiKey = 'RGAPI-db5d785b-0e08-4bdc-ac6e-c74b95f2deed'; // For now it's text ( key is only valid 24h anyways), but later we'll read it from token.js
const regions = {
  br:	'br1',
  eune:	'eun1',
  euw:	'euw1',
  jp:	'jp1',
  kr:	'kr',
  lan:	'la1',
  las:	'la2',
  na:	'na1',
  oce:	'oc1',
  tr:	'tr1',
  ru:	'ru',
  pbe:	'pbe1'
};
const getRiotURL = region => {
  if (regions[region]) {
    return `https://${regions[region]}.api.riotgames.com`;
  }
  return null;
};
const header = { 'X-Riot-Token': apiKey }; // Not sure if this is correct
const checkSummonerName = /^[0-9\p{L} _.]+$/; // Original in docs: ^[0-9\\p{L} _\\.]+$

module.exports = {
  main: async (bot, msg) => {
    const args = msg.content.split(/ +/);
    let region;
    if (args[0]) {
      region = args[0].toLowerCase();
    } else {
      msg.reply(`You need to specify the region you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help lolstats\``);
      return;
    }
    if (!regions[region]) {
      msg.reply(`You need to specify a correct region you want to search. To get a list of them use \`${bot.PREFIXES[msg.guild.id]}.help lolstats\``);
      return;
    }
    const userName = msg.content.substr(region.length);
    console.log(`Username: ${userName}, Region: ${region}`);
    const info = [];

    // TODO check inputs
    /*
    if (userName.length < 2 || !checkSummonerName.test(userName)) {
      msg.reply(`${userName} is not a valid summonername.`);
      return;
    }
    */

    const riotURL = getRiotURL(region);
    console.log(`contacting ${riotURL} ...`);
    let summoner = await axios.get(`${riotURL}/lol/summoner/v3/summoners/by-name/${userName}`, { headers: header }).catch(e => console.error(e));
    if (summoner && summoner.data) {
      summoner = summoner.data;
    } else {
      msg.channel.send('Something went wrong whilst contacting the API...');
      return;
    }
    console.log(`Summoner we got: ${summoner.name}: Lv. ${summoner.summonerLevel}`);
    info.push({
      name: 'Summoner:',
      value: `${summoner.name}, Lv. ${summoner.summonerLevel}`,
      inline: false
    });
    info.push({
      name: 'Profile changed last:',
      value: `${(new Date(summoner.revisionDate)).toLocaleDateString('en-US', options)}`,
      inline: true
    });
    info.push({
      name: 'Summoner ID:',
      value: `${summoner.id}`,
      inline: true
    });

    // Get ranking
    let getData = await axios.get(`${riotURL}/lol/league/v3/positions/by-summoner/${summoner.id}`, header);
    if (getData && getData.data) {
      getData = getData.data;
      let i = true;
      for (const leaguePos in getData) {
        if (i) {
          i = false;
          info.push({
            name: `${leaguePos.queueType}:`,
            value: `Wins: ${leaguePos.wins}`,
            inline: false
          });
        }
      }
    }
    /*
    // Get top 5 champs
    getData = await axios.get(`${riotURL}/lol/champion-mastery/v3/champion-masteries/by-summoner/${summoner.id}`, header);
    if (getData && getData.data) {
      getData = getData.data;
            info.push({
        name: 'Champion mastery:',
        value: getData,
        inline: false
      });
          }

    // Get current match
    getData = await axios.get(`${riotURL}/lol/spectator/v3/active-games/by-summoner/${summoner.id}`, header);
    if (getData && getData.data) {
      getData = getData.data;
            info.push({
        name: 'Current game:',
        value: getData,
        inline: false
      });
          }
*/
    const embed = {
      color: bot.COLOR,
      fields: info,
      footer: {
        /* eslint-disable camelcase*/
        icon_url: 'https://www.riotgames.com/darkroom/original/06fc475276478d31c559355fa475888c:af22b5d4c9014d23b550ea646eb9dcaf/riot-logo-fist-only.png',
        /* eslint-enable camelcase*/
        text: 'powered by api.riotgames.com'
      }
    };

    msg.channel.send({ embed });
  },
  ehelp(msg, bot) {
    const ret = [];
    ret.push({
      name: '<region> <summoner name>',
      value: `Get the League of Legends stats about a certain user.\nAn example would be: \`${bot.PREFIXES[msg.guild.id]}.lolstats euw MyUserName\`\n\n**Possible region parameters:**\nbr, eune, euw, jp, kr, lan, las, na, oce, tr, ru, pbe`
    });
    return ret;
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Games' // TODO add this to the categories
};

