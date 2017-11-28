var sounds = {
    "185865492576075776": /*"https://canary.discordapp.com/assets/b9411af07f154a6fef543e7e442e4da9.mp3"*/"https://www.myinstants.com/media/sounds/omae-wa-mou-shindeiru.mp3", //ich
    "226383324262825985": "https://cdn.discordapp.com/attachments/227833391368634369/385169278455906314/Stalker_Bandit_quotes-nSOD2QDbOkc_mp3cut.net.mp3", //tim
    "185845248163840002": "https://www.myinstants.com/media/sounds/nanimp3.mp3", //nico
    "201768238890221568": "https://www.myinstants.com/media/sounds/ha-gay.mp3", //Kai
    "166649033669083136": "https://www.myinstants.com/media/sounds/falconpunch.swf.mp3" //matti
}

module.exports = {
    path: (sound) => {
        return sounds[sound];
    }
};