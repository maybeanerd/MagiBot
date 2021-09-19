// commands made by Basti for use of the Bot
import Discord, {
	ButtonInteraction,
	Interaction,
	MessageActionRow,
	MessageButton,
	MessageComponent,
	MessageComponentInteraction,
} from 'discord.js';

export async function findMember(
	guild: Discord.Guild,
	ment: string,
): Promise<string | null> {
	if (!ment) {
		return null;
	}
	const mention = ment.toLowerCase();
	if (mention.startsWith('<@') && mention.endsWith('>')) {
		let id = mention.slice(2, -1);
		if (id.startsWith('!')) {
			id = id.substr(1);
		}
		return id;
	}
	const user = await guild.members.fetch(mention);
	if (user) {
		return user.id;
	}
	if (mention.length >= 3) {
		let memberArray = guild.members.cache.filter((memb) => memb.displayName.toLowerCase().startsWith(mention));
		if (memberArray.size === 1) {
			return memberArray.first()!.id;
		}
		if (memberArray.size === 0) {
			memberArray = guild.members.cache.filter((memb) => memb.displayName.toLowerCase().includes(mention));
			if (memberArray.size === 1) {
				return memberArray.first()!.id;
			}
		}
	}
	return null;
}

export async function findRole(guild: Discord.Guild, ment: string) {
	if (!ment) {
		return false;
	}
	const mention = ment.toLowerCase();
	if (mention.startsWith('<@&') && mention.endsWith('>')) {
		const id = mention.substr(3).slice(0, -1);
		return id;
	}
	const role = await guild.roles.fetch(mention);
	if (role) {
		return role.id;
	}
	if (mention.length >= 3) {
		let roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().startsWith(mention));
		if (roleArray.size === 1) {
			return roleArray[0].id;
		}
		if (roleArray.size === 0) {
			roleArray = guild.roles.cache.filter((rol) => rol.name.toLowerCase().includes(mention));
			if (roleArray.size === 1) {
				return roleArray[0].id;
			}
		}
	}
	return false;
}

export function doNothingOnError() {}

export function returnNullOnError() {
	return null;
}

// for some reason eslint doesnt get this...
// eslint-disable-next-line no-shadow
export const enum buttonId {
  'yesOrNo' = 0x0001,
  'queue' = 0x1001,
}

// this is an idea to implement rather reusable confirmation processes.
// ; abortMessage, timeoutMessage and time are optional parameters
export async function yesOrNo(
	msg: Discord.Message,
	question: string,
	abortMessage?: string,
	timeoutMessage?: string,
	timeoutTime?: number,
): Promise<boolean> {
	const row = new MessageActionRow();
	row.addComponents(
		new MessageButton()
			.setCustomId(`${buttonId.yesOrNo}-${msg.id}-yes`)
			.setLabel('Yes')
			.setStyle('SUCCESS'),
	);
	row.addComponents(
		new MessageButton()
			.setCustomId(`${buttonId.yesOrNo}-${msg.id}-no`)
			.setLabel('No')
			.setStyle('DANGER'),
	);
	const questionMessage = await msg.channel.send({
		content: question,
		components: [row],
	});
	const time = timeoutTime || 20000;
	const messageForTimeout = timeoutMessage || 'Cancelled due to timeout.';
	// only accept reactions from the user that created this question
	const filter = (interaction: MessageComponentInteraction) => interaction.user.id === msg.author.id
    && interaction.customId.startsWith(`${buttonId.yesOrNo}-${msg.id}-`);
	const collector = msg.channel.createMessageComponentCollector({
		filter,
		time,
	});
	const promise = new Promise<boolean>((resolve) => {
		let alreadyResolved = false;
		collector.once('collect', async (interaction) => {
			alreadyResolved = true;
			// load info of that button
			const idParts = interaction.customId.split('-');
			const isYesButton = idParts[2] === 'yes';
			questionMessage.delete();
			if (!isYesButton && abortMessage) {
				questionMessage.channel.send(abortMessage).catch(doNothingOnError);
			}
			resolve(isYesButton);
			collector.stop('Got an answer.');
		});
		collector.once('end', (/* collected */) => {
			if (!alreadyResolved) {
				msg.channel.send(messageForTimeout);
				resolve(false);
			}
		});
	});
	return promise;
}

export function printError(error) {
	console.error(
		`Errorstatus: ${error.response.status} ${error.response.statusText}`,
	);
}

export async function asyncForEach<T, F, O>(
	values: Array<T> | Discord.Collection<string | number, T>,
	callback: (
    input: T,
    index: number | string,
    optionalParams?: O
  ) => Promise<F>,
	optParams?: O,
) {
	if (Array.isArray(values)) {
		const arr = values.map((e, i) => callback(e, i, optParams));
		return Promise.all<F>(arr);
	}
	const arr = values.map((e, i) => callback(e, i, optParams));
	return Promise.all<F>(arr);
}

// unused
export async function asyncForEachFromFlint<T, F, N, O>(
	array: Array<T> | Map<N, T>,
	callback: (input: T, index: number | N, optParams?: O) => Promise<F>,
	optionalParams?: O,
) {
	if (Array.isArray(array)) {
		const arr = array.map((e, i) => callback(e, i, optionalParams));
		return Promise.all<F>(arr);
	}
	const arr: Array<Promise<F>> = [];
	array.forEach((e, i) => arr.push(callback(e, i, optionalParams)));
	return Promise.all<F>(arr);
}

export async function asyncWait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
