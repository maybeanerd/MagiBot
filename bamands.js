// commands made by Basti for use of the Bot 

//TODO question-answer- procedure

module.exports = {
    findMember: async function f(guild, mention, important) {
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            id = mention.substr(2).slice(0, -1);
            if (id.startsWith('!')) {
                id = id.substr(1);
            }
            return id;
        } else {
            let user = await guild.fetchMember(mention).catch();
            if (user) {
                return user.id;
            }
            if (important) {
                return false;
            }
            let member = await guild.members.find("nickname", mention).catch();
            if (member) {
                return member.id;
            } else {
                return false;
            }
        }
    },
    findRole: async function f(guild, mention, important) {
        if (mention.startsWith('<@&') && mention.endsWith('>')) {
            id = mention.substr(3).slice(0, -1);
            return id;
        } else {
            let role = await guild.roles.get(mention).catch();
            if (role) {
                return role.id;
            }
            if (important) {
                return false;
            }
            let nrole = await guild.roles.find("name", mention).catch();
            if (nrole) {
                return nrole.id;
            } else {
                return false;
            }
        }
    }

};