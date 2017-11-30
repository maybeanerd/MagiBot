var sounds = {
    "185865492576075776": /*"https://canary.discordapp.com/assets/b9411af07f154a6fef543e7e442e4da9.mp3"*/"https://www.myinstants.com/media/sounds/omae-wa-mou-shindeiru.mp3", //ich
    "226383324262825985": "https://cdn.discordapp.com/attachments/227833391368634369/385904124442705923/Stalker_Bandit_quotes-nSOD2QDbOkc_mp3cut.net.mp3"/*"https://cdn.discordapp.com/attachments/227833391368634369/385904858311557121/BattoSound.mp3"*/, //tim
    "185845248163840002": "https://www.myinstants.com/media/sounds/nanimp3.mp3", //nico
    "201768238890221568": "https://www.myinstants.com/media/sounds/ha-gay.mp3", //Kai
    "166649033669083136": "https://www.myinstants.com/media/sounds/falconpunch.swf.mp3", //matti
    "237918762790027264": "https://cdn.discordapp.com/attachments/227833391368634369/385176456524857353/tim_warum_bin_ich_so_autistisch.wav", //stefan
    "209642947287711744": "https://cdn.discordapp.com/attachments/209646040675123200/385177764678074379/flavio_mweeeeeh.wav", //flavio
    "186052540729655296": "https://cdn.discordapp.com/attachments/186064880556703744/385181918314102794/dadadadadaaaa.wav", //severin
    "216979437865009152": "https://cdn.discordapp.com/attachments/229604639069175809/385902962737938432/NiksDa_-_Leb_deinen_Champ_Digimon_LoL_Parodie.mp3" //Hannes
}

module.exports = {
    path: (sound) => {
        return sounds[sound];
    }
};