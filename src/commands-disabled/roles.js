// const avroles = { Switch: 'Switch' };
module.exports = {
  main(bot, msg) {
    /* var role=(msg.content.split(" "))[0];
    if(avroles[role]){
    msg.member.addRole(avroles[role]);
    msg.reply("dir wurde erfolgreich die Rolle "+role+" zugewiesen.");
    }
    else{
    if(role!==''){
    msg.reply("die Rolle "+role+" existiert nicht.");
    }else{ */
    msg.channel.send("Getting other roles is as simple as this: Type t!selfroles get role in <#198764451132997632>\nDont @mention the role, you'll only spam notifications!\nExample usage: t!selfroles get Switch\nAvailable roles:\nSwitch, League of Legends, Dauntless, Town of Salem, Fortnite, Civilization, PUBG\n☝ if <@172002275412279296> is offline this won't work❗\nthe roles are mainly to find people to play with in <#365179633857200138>");
    // }
    // }
  },
  admin: false,
};
