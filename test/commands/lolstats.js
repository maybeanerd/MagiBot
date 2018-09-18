const axios = require('axios');
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
const checkSummonerName = /^[0-9\\p{L} _\\.]+$/;

module.exports = {
  main: async (bot, msg) => {
    const args = msg.content.split(/ +/);
    const userName = args[0]; // Change to allow spaces in Name
    let region;
    if (args[1]) {
      region = args[1].toLowerCase();
    } else {
      region = 'euw'; // We use EUW Servers by default
    }
    console.log(`Username: ${userName}, Region: ${region}`);
    const info = [];
    // TODO check inputs
    /*
    if (!checkSummonerName.test(userName)) {
      msg.reply('That\'s not a valid summonername.');
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
      name: 'Summoner data:',
      value: `${summoner.name}: Lv. ${summoner.summonerLevel}`,
      inline: false
    });
    /*
      // Get ranking
      let getData = await axios.get(`${riotURL}/lol/league/v3/positions/by-summoner/${summoner.id}`, header);
      if (getData) getData = getData.data;
      if (getData) {
        info.push({
          name: 'Ranking:',
          value: getData,
          inline: false
        });
      }
      // Get top 5 champs
      getData = await axios.get(`${riotURL}/lol/champion-mastery/v3/champion-masteries/by-summoner/${summoner.id}`, header);
      if (getData) getData = getData.data;
      if (getData) {
        info.push({
          name: 'Champion mastery:',
          value: getData,
          inline: false
        });
      }
      // Get current match
      getData = await axios.get(`${riotURL}/lol/spectator/v3/active-games/by-summoner/${summoner.id}`, header);
      if (getData) getData = getData.data;
      if (getData) {
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
      title: 'Tis a summoner',
      description: 'description',
      footer: {
        /* eslint-disable camelcase*/
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase*/
        text: 'powered by api.riotgames.com'
      }
    };

    msg.channel.send({ embed });
  },
  ehelp() {
    return [{ name: '', value: 'Some league stuff.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Games' // TODO add this to the categories
};

