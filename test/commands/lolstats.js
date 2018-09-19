const axios = require('axios');
const bamands = require(`${__dirname}/../bamands.js`);
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
/* eslint-disable camelcase*/
const queueTypes = {
  RANKED_SOLO_5x5: 'Solo',
  RANKED_FLEX_TT: 'Flex TT',
  RANKED_FLEX_SR: 'Flex SR'
};
/* eslint-enable camelcase*/
const rankEmoji = {
  bronze: '<:bronze:491866610668404736>',
  silver: '<:silver:491866611163332608>',
  gold: '<:gold:491866611121389578>',
  platinum: '<:platinum:491866611662454784>',
  diamond: '<:diamond:491866610815074317>',
  master: '<:master:491866611611861002>',
  challenger: '<:challenger:491866611473711104>'
};
const tierURL = {
  unranked: 'https://cdn.discordapp.com/attachments/386915523524558849/491879562330767360/provisional.png',
  bronzei: 'https://cdn.discordapp.com/attachments/386915523524558849/491880178843123723/bronze_i.png',
  bronzeii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880181120761857/bronze_ii.png',
  bronzeiii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880183658446849/bronze_iii.png',
  bronzeiv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880186199932938/bronze_iv.png',
  bronzev: 'https://cdn.discordapp.com/attachments/386915523524558849/491880188141895681/bronze_v.png',
  silveri: 'https://cdn.discordapp.com/attachments/386915523524558849/491880292181737472/silver_i.png',
  silverii: 'https://cdn.discordapp.com/attachments/386915523524558849/491882892603949066/silver_ii.png',
  silveriii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880313102925839/silver_iii.png',
  silveriv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880316605300737/silver_iv.png',
  silverv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880318345674752/silver_v.png',
  goldi: 'https://cdn.discordapp.com/attachments/386915523524558849/491882817618182144/gold_i.png',
  goldii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880267812962304/gold_ii.png',
  goldiii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880270056914964/gold_iii.png',
  goldiv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880272845864971/gold_iv.png',
  goldv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880275823951883/gold_v.png',
  platinumi: 'https://cdn.discordapp.com/attachments/386915523524558849/491880279267344394/platinum_i.png',
  platinumii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880281326747660/platinum_ii.png',
  platinumiii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880284615213056/platinum_iii.png',
  platinumiv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880286804770826/platinum_iv.png',
  platinumv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880289862287360/platinum_v.png',
  diamondi: 'https://cdn.discordapp.com/attachments/386915523524558849/491880189983195146/diamond_i.png',
  diamondii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880192072089601/diamond_ii.png',
  diamondiii: 'https://cdn.discordapp.com/attachments/386915523524558849/491880195037593600/diamond_iii.png',
  diamondiv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880197252055041/diamond_iv.png',
  diamondv: 'https://cdn.discordapp.com/attachments/386915523524558849/491880198590038017/diamond_v.png',
  master: 'https://cdn.discordapp.com/attachments/386915523524558849/491879556068671499/master.png',
  challenger: 'https://cdn.discordapp.com/attachments/386915523524558849/491879549743792136/challenger.png'
};
const getRiotURL = region => {
  if (regions[region]) {
    return `https://${regions[region]}.api.riotgames.com`;
  }
  return null;
};
const header = {
  'Accept-Charset': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  'X-Riot-Token': apiKey
}; // Not sure if this is correct
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
    let info = [];

    // TODO check inputs
    /*
    if (userName.length < 2 || !checkSummonerName.test(userName)) {
      msg.reply(`${userName} is not a valid summonername.`);
      return;
    }
    */

    const riotURL = getRiotURL(region);
    console.log(`contacting ${riotURL} ...`);
    let summoner = await axios.get(`${riotURL}/lol/summoner/v3/summoners/by-name/${userName}`, { headers: header }).catch(bamands.catchError);
    if (summoner && summoner.data) {
      summoner = summoner.data;
    } else {
      msg.channel.send(`There seems no summoner named${userName} exists in the ${region} region.`);
      return;
    }
    info.push({
      name: `Summoner: ${summoner.name}, Lv. ${summoner.summonerLevel}`,
      value: `updated profile on ${(new Date(summoner.revisionDate)).toLocaleDateString('en-US', options)}, id: ${summoner.id}`,
      inline: false
    });
    let tier;
    // Get ranking
    let getData = await axios.get(`${riotURL}/lol/league/v3/positions/by-summoner/${summoner.id}`, { headers: header }).catch(bamands.catchError);
    if (getData && getData.data) {
      getData = getData.data;
      if (getData.length == 0) {
        tier = 'unranked';
        info.push({
          name: 'Ranked Stats:',
          value: `There are no ranked stats available for ${summoner.name}...`,
          inline: false
        });
      }
      for (let leaguePos in getData) {
        leaguePos = getData[leaguePos];
        // We take the first tier we get, but if we get solo stats we will always prefer those
        if (!tier || leaguePos.queueType == 'RANKED_SOLO_5x5') {
          tier = leaguePos.tier.toLowerCase();
          if (leaguePos.rank) {
            tier += leaguePos.rank.toLowerCase();
          }
        }
        let additions = '';
        if (leaguePos.veteran) {
          additions += ', veteran';
        }
        if (leaguePos.inactive) {
          additions += ', inactive';
        }
        if (leaguePos.freshBlood) {
          additions += ', fresh blood';
        }
        info.push({
          name: `${queueTypes[leaguePos.queueType]}: ${leaguePos.tier.charAt(0) + leaguePos.tier.toLowerCase().slice(1)} ${leaguePos.rank} ${rankEmoji[leaguePos.tier.toLowerCase()]}`,
          value: `Wins: ${leaguePos.wins}, Losses: ${leaguePos.losses} (${Math.round((leaguePos.wins / leaguePos.losses) * 100) / 100})${additions}\n${leaguePos.leagueName}, ${leaguePos.leaguePoints} league points`,
          inline: true
        });
      }
    }

    let embed = {
      color: bot.COLOR,
      fields: info,
      thumbnail: { url: tierURL[tier] },
      footer: {
        /* eslint-disable camelcase*/
        icon_url: 'https://www.riotgames.com/darkroom/original/06fc475276478d31c559355fa475888c:af22b5d4c9014d23b550ea646eb9dcaf/riot-logo-fist-only.png',
        /* eslint-enable camelcase*/
        text: 'powered by api.riotgames.com'
      }
    };

    msg.channel.send({ embed });
    info = [];

    // Create a new embed for these stats in the future:
    /*
    // Get top 5 champs
    getData = await axios.get(`${riotURL}/lol/champion-mastery/v3/champion-masteries/by-summoner/${summoner.id}`, { headers: header }).catch(bamands.catchError);
    if (getData && getData.data) {
      getData = getData.data;
            info.push({
        name: 'Champion mastery:',
        value: getData,
        inline: false
      });
          }

    // Get current match
    getData = await axios.get(`${riotURL}/lol/spectator/v3/active-games/by-summoner/${summoner.id}`, { headers: header }).catch(bamands.catchError);
    if (getData && getData.data) {
      getData = getData.data;
            info.push({
        name: 'Current game:',
        value: getData,
        inline: false
      });
          }
*/
    if (info.length > 0) {
      embed = {
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
    }
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

