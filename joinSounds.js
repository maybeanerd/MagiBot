var sounds = {
    "185865492576075776": /*"https://canary.discordapp.com/assets/b9411af07f154a6fef543e7e442e4da9.mp3"*/"https://www.myinstants.com/media/sounds/nanimp3.mp3", //ich
    "226383324262825985": "https://cdn.discordapp.com/attachments/227833391368634369/385906076568256512/Oriam_nachrim.mp3"/*"https://cdn.discordapp.com/attachments/227833391368634369/385904858311557121/BattoSound.mp3"*/, //tim
    "185845248163840002": "https://cdn.discordapp.com/attachments/185868764137390080/385905030533873664/ahmed-the-dead-terrorist-silence-i-kill-you_.mp3", //nico
    "201768238890221568": "https://www.myinstants.com/media/sounds/ha-gay.mp3", //Kai
    "166649033669083136": "https://www.myinstants.com/media/sounds/falconpunch.swf.mp3", //matti
    "237918762790027264": "https://cdn.discordapp.com/attachments/227833391368634369/385176456524857353/tim_warum_bin_ich_so_autistisch.wav", //stefan
    "209642947287711744": "https://cdn.discordapp.com/attachments/209646040675123200/385177764678074379/flavio_mweeeeeh.wav", //flavio
    "186052540729655296": "https://cdn.discordapp.com/attachments/186064880556703744/385181918314102794/dadadadadaaaa.wav", //severin
    "216979437865009152": "https://cdn.discordapp.com/attachments/229604639069175809/385902962737938432/NiksDa_-_Leb_deinen_Champ_Digimon_LoL_Parodie.mp3", //Hannes
    "165854980262199297": "https://www.myinstants.com/media/sounds/im-really-feeling-it.mp3", //Tobi
    "295899170454372352": "https://cdn.discordapp.com/attachments/301696653877051393/386176575923552256/OVERWATCH__-_Bastion_Ultimate_Sound.mp3" //Lucas Ashura
}

module.exports = {
    path: (sound) => {
        return sounds[sound];
    }
};