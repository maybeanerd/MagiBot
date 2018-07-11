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
            let role = await guild.roles.get(mention);
            if (role) {
                return role.id;
            }
            if (mention.length >= 3) {
                let roleArray = await guild.roles.filterArray((rol) => {
                    return rol.name.toLowerCase().startsWith(mention);
                });
                if (roleArray.length == 1) {
                    return roleArray[0].id;
                }
            }
            return false;
        }
    },
    //this is an idea to implement rather reusable confirmation processes. ; abortMessage, timeoutMessage and time are optional parameters
    yesOrNo: async (msg, question, abortMessage, timeoutMessage, time) => {
        return msg.channel.send(question).then(async (mess) => {
            const filter = (reaction, user) => {
                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id);
            };
            await mess.react('☑');
            await mess.react('❌');
            if (!time) {
                time = 20000;
            }
            return mess.awaitReactions(filter, { max: 1, time: time }).then(reacts => {
                mess.delete();
                if (reacts.first() && reacts.first().emoji.name == '☑') {
                    return true;
                } else if (reacts.first()) {
                    if (!abortMessage) {
                        abortMessage = "Successfully canceled transaction.";
                    }
                    msg.channel.send(abortMessage);
                    return false;
                } else {
                    if (!timeoutMessage) {
                        timeoutMessage = "Cancelled due to timeout.";
                    }
                    msg.channel.send(timeoutMessage);
                    return false;
                }
            });
        });
    }
};