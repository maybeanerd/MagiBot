// commands made by Basti for use of the Bot 
module.exports = {
    findMember: async function f(guild, mention) {
        if (!mention) { return false; }
        mention = mention.toLowerCase();
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            id = mention.substr(2).slice(0, -1);
            if (id.startsWith('!')) {
                id = id.substr(1);
            }
            return id;
        } else {
            let user = await guild.fetchMember(mention).catch(() => { });
            if (user) {
                return user.id;
            }
            if (mention.length >= 3) {
                let memberArray = await guild.members.filterArray((memb) => {
                    return memb.displayName.toLowerCase().startsWith(mention);
                });
                if (memberArray.length == 1) {
                    return memberArray[0].id;
                }
            }
            return false;
        }

    },
    findRole: async function f(guild, mention) {
        if (!mention) { return false; }
        mention = mention.toLowerCase();
        if (mention.startsWith('<@&') && mention.endsWith('>')) {
            id = mention.substr(3).slice(0, -1);
            return id;
        } else {
            let role = await guild.roles.get(mention).catch(() => { });
            if (role) {
                return role.id;
            }
            if (mention.length >= 3) {
                let roleArray = await guild.members.filterArray((rol) => {
                    return rol.name.toLowerCase().startsWith(mention);
                });
                if (roleArray.length == 1) {
                    return roleArray[0].id;
                }
            }
            return false;
        }
    }

};