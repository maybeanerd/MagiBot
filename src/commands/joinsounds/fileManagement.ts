import { GuildMember } from 'discord.js';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
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
	get(url, (res) => {
		const writeStream = createWriteStream(path);
		res.pipe(writeStream);
		writeStream.on('finish', () => {
			writeStream.close();
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

async function doesUserHaveEnoughSpace(member: GuildMember) {
	const path = Path.join(basePath, member.id);
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

export async function saveJoinsoundOfUser(
	member: GuildMember,
	fileUrl: string,
) {
	if (!(await doesServerHaveEnoughSpace())) {
		// this should not happen. but if it does, we handle it to stop the server from being overloaded
		throw new Error('Server folder is too large!');
	}
	if (!(await doesUserHaveEnoughSpace(member))) {
		console.log('folder too large already!');
		return false;
	}
	const filename = Path.join(basePath, member.id, `${member.guild.id}.audio`);
	await downloadFile(fileUrl, filename);
	return true;
}
