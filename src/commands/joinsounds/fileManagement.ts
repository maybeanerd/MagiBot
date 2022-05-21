import { GuildMember } from 'discord.js';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import Path from 'path';
import { get } from 'node:https';
import fastFolderSize from 'fast-folder-size';

const basePath = Path.join(__dirname, '../../../joinsounds');

export async function setupLocalFolders() {
	await mkdir(basePath).catch((error) => {
		// If the error is that it already exists, that's fine
		if (error.code !== 'EEXIST') {
			throw error;
		}
	});
}

async function downloadFile(url: string, path: string) {
	console.log('downloading file....');
	return new Promise<void>((resolve /* , reject */) => {
		get(url, (res) => {
			const writeStream = createWriteStream(path);
			res.pipe(writeStream);
			writeStream.on('finish', () => {
				writeStream.close();
				resolve();
			});
		});
	});
}

function getFolderSize(path: string): Promise<number> {
	return new Promise((resolve, reject) => {
		fastFolderSize(path, (err, bytes) => {
			if (err) {
				reject(err);
			}
			resolve(bytes !== undefined ? bytes : 9999999);
		});
	});
}

const oneMegabyte = 1024 * 1024;
const fourtyGigabyte = 40 * 1024 * oneMegabyte;

async function doesServerHaveEnoughSpace() {
	const sizeOfFolder = await getFolderSize(basePath);
	console.log('sizeOfServerFolder', sizeOfFolder);
	return sizeOfFolder <= fourtyGigabyte;
}

function getMemberPath(member: GuildMember) {
	return Path.join(basePath, `user_${member.id}`);
}

async function doesUserHaveEnoughSpace(member: GuildMember) {
	const path = getMemberPath(member);
	await mkdir(path).catch((error) => {
		// If the error is that it already exists, that's fine
		if (error.code !== 'EEXIST') {
			throw error;
		}
	});
	const sizeOfFolder = await getFolderSize(path);
	console.log('sizeOfFolder', sizeOfFolder);
	return sizeOfFolder <= oneMegabyte;
}

function getFilename(member: GuildMember, isDefault: boolean) {
	const title = isDefault ? 'default' : `guild_${member.guild.id}`;
	return Path.join(getMemberPath(member), title);
}

export async function storeJoinsoundOfUser(
	member: GuildMember,
	fileUrl: string,
	isDefault = false,
) {
	if (!(await doesServerHaveEnoughSpace())) {
		// this should not happen. but if it does, we handle it to stop the server from being overloaded
		throw new Error('Server folder is too large!');
	}
	if (!(await doesUserHaveEnoughSpace(member))) {
		console.log('folder too large already!');
		return false;
	}
	const filename = getFilename(member, isDefault);
	await downloadFile(fileUrl, filename);
	return true;
}

export async function removeJoinsoundOfUser(
	member: GuildMember,
	isDefault = false,
) {
	const filename = getFilename(member, isDefault);
	await unlink(filename);
}

export function getJoinsoundLocationOfUser(
	member: GuildMember,
	isDefault = false,
) {
	return getFilename(member, isDefault);
}
