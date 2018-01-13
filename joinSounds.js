var sounds = {
    "185865492576075776": "https://cdn.discordapp.com/attachments/185868764137390080/387360631671488513/onward.mp3", //ich
    "226383324262825985": "https://cdn.discordapp.com/attachments/227833391368634369/386665940181450772/Stalker_-_Bandit.mp3", //tim
    "185845248163840002": "https://cdn.discordapp.com/attachments/185868764137390080/401830319025815553/sexykaiba.mp3", //nico
    "201768238890221568": "https://cdn.discordapp.com/attachments/212909971224920065/400688108158451712/Join_Sound.wav", //Kai
    "166649033669083136": "https://cdn.discordapp.com/attachments/267743281461329920/401450357730836480/Choo_Choo.mp3", //matti
    "237918762790027264": "https://cdn.discordapp.com/attachments/239520611389538304/390999323879669761/tagliches_mantra_kayle.mp3", //stefan
    "209642947287711744": "https://cdn.discordapp.com/attachments/209646040675123200/385177764678074379/flavio_mweeeeeh.wav", //flavio
    "186052540729655296": "https://cdn.discordapp.com/attachments/186064880556703744/401417805963984906/windows-xp-startup-earrape_low_volume.mp3", //severin
    "216979437865009152": "https://cdn.discordapp.com/attachments/229604639069175809/385902962737938432/NiksDa_-_Leb_deinen_Champ_Digimon_LoL_Parodie.mp3", //Hannes
    "165854980262199297": "https://www.myinstants.com/media/sounds/im-really-feeling-it.mp3", //Tobi
    "295899170454372352": "https://cdn.discordapp.com/attachments/301696653877051393/398623143025049600/Crylikeabitch.mp3", //Lucas Ashura
    "186481395416170496": "https://cdn.discordapp.com/attachments/386915523524558849/395578990938685440/tschuldigung_mama.mp3", //Julian
    "220957687683219458": "https://cdn.discordapp.com/attachments/354273411935240192/388034541945618438/MLG_SOUND_EFFECT-_AIR_HORNS.mp3", //Rizzers
    "339901226185392131": "https://cdn.discordapp.com/attachments/388068452314775553/388068621873577985/Hitler_NEIN_1.mp3", //tauri
    "206502772533624832": "https://cdn.discordapp.com/attachments/237986334302535680/394940046232256522/80187__robinhood76__01277-witch-cackle-laughter-1.wav", //hendrik
    "189452193739309068": "https://cdn.discordapp.com/attachments/192029546327965697/395001521361649674/Allahu_-_Akbar.mp3", //jonas
    "223034095339307008": "https://cdn.discordapp.com/attachments/386915523524558849/395578991509110794/achso_du_hast_uns_getrollt.mp3", //arrge
    "391927619701964805": "https://cdn.discordapp.com/attachments/386915523524558849/395578994109710346/DDDDEPORTED.mp3", //filip
    "204331591705690114": "https://cdn.discordapp.com/attachments/185868764137390080/399335035997782026/Du_Schwamm.mp3", //johann
    "203247775209619456": "https://cdn.discordapp.com/attachments/203248018231787520/401465484676956161/Hearthstone_-_Murloc.mp3", //paul
    "364416438305292291": "https://cdn.discordapp.com/attachments/399617351701758002/401453955336372234/DA_DA_DA_DA_online-audio-converter.com_1.mp3", //adrian
    "358707393623752705": "https://cdn.discordapp.com/attachments/381197362049056768/401842015371001868/Sion_Op_Guide__Atomare_Power_mp3cut.net.mp3" //Calvin
}

module.exports = {
    path: (sound) => {
        return sounds[sound];
    }
};