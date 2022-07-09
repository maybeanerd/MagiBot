import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir, unlink, stat, readdir, rmdir,
} from 'node:fs/promises';
import Path from 'path';
import { get } from 'node:https';
import fastFolderSize from 'fast-folder-size';
import { asyncForEach } from '../../helperFunctions';

const basePath = Path.join(__dirname, '../../../joinsounds');

type JoinsoundTarget =
  | { userId: string; guildId: string; default?: undefined }
  | { userId: string; guildId?: undefined; default: true }
  | { userId?: undefined; guildId: string; default: true };

// eslint-disable-next-line no-shadow
export const enum JoinsoundStoreError {
  noStorageLeftOnServer = 0x1000,
  noStorageLeftForUser = 0x1001,
}

async function setupLocalFolders() {
  await mkdir(basePath).catch((error) => {
    // If the error is that it already exists, that's fine
    if (error.code !== 'EEXIST') {
      throw error;
    }
  });
}
setupLocalFolders();

async function downloadFile(url: string, path: string) {
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

export const joinsoundStorageUserLimit = oneMegabyte;

async function doesServerHaveEnoughSpace() {
  const sizeOfFolder = await getFolderSize(basePath);
  return sizeOfFolder <= fourtyGigabyte;
}

const userPrefix = 'user_';
const guildPrefix = 'guild_';

function getTargetPath(target: JoinsoundTarget) {
  return Path.join(
    basePath,
    target.userId
      ? `${userPrefix}${target.userId}`
      : `${guildPrefix}${target.guildId}`,
  );
}

// eslint-disable-next-line no-undef
function gracefullyCatchENOENT(error: NodeJS.ErrnoException) {
  // If the error is that it doesn't exists, that's fine
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

export async function getSpaceUsedByTarget(target: JoinsoundTarget) {
  const path = getTargetPath(target);
  await mkdir(path).catch((error) => {
    // If the error is that it already exists, that's fine
    if (error.code !== 'EEXIST') {
      throw error;
    }
  });
  return getFolderSize(path);
}

async function doesUserHaveEnoughSpace(
  target: JoinsoundTarget,
  targetFileName: string,
) {
  const sizeOfFolder = await getSpaceUsedByTarget(target);
  const statsOfExistingFile = await stat(targetFileName).catch(
    gracefullyCatchENOENT,
  );
  const sizeOfExistingFile = statsOfExistingFile?.size || 0;
  // TODO also count in the size of the file we are about to download!
  // This just makes sure we don't already go over the limit
  return sizeOfFolder - sizeOfExistingFile <= joinsoundStorageUserLimit;
}

function getFilename(target: JoinsoundTarget) {
  const title = target.default ? 'default' : `${guildPrefix}${target.guildId}`;
  return Path.join(getTargetPath(target), title);
}

export async function storeJoinsoundOfTarget(
  target: JoinsoundTarget,
  fileUrl: string,
) {
  if (!(await doesServerHaveEnoughSpace())) {
    // this should not happen. but if it does, we handle it to stop the server from being overloaded
    return JoinsoundStoreError.noStorageLeftOnServer;
  }
  const filename = getFilename(target);
  if (!(await doesUserHaveEnoughSpace(target, filename))) {
    return JoinsoundStoreError.noStorageLeftForUser;
  }
  await downloadFile(fileUrl, filename);
  return null;
}

export async function removeLocallyStoredJoinsoundOfTarget(
  target: JoinsoundTarget,
) {
  const filename = getFilename(target);
  await unlink(filename).catch(gracefullyCatchENOENT);
}

async function getExistingUserFolders() {
  const folders = await readdir(basePath, { withFileTypes: true });
  return folders
    .filter(
      (directory) => directory.isDirectory() && directory.name.startsWith(userPrefix),
    )
    .map((directory) => directory.name.substring(userPrefix.length));
}

export async function removeLocallyStoredJoinsoundsOfGuild(guildId: string) {
  // remove default server sound
  await removeLocallyStoredJoinsoundOfTarget({ guildId, default: true });

  // remove server folder
  await rmdir(Path.join(basePath, `${guildPrefix}${guildId}`)).catch(
    gracefullyCatchENOENT,
  );

  // remove sounds of all users in server
  const userIds = await getExistingUserFolders();
  await asyncForEach(userIds, async (userId) => {
    await removeLocallyStoredJoinsoundOfTarget({ userId, guildId });
  });
}

async function getExistingSoundFilesOfUser(userId: string) {
  const files = await readdir(getTargetPath({ userId, default: true }), {
    withFileTypes: true,
  });
  return files
    .filter((file) => file.isFile() && file.name.startsWith(guildPrefix))
    .map((file) => file.name.substring(guildPrefix.length));
}

export async function getAllLocallyStoredJoinsoundsOfUser(userId: string) {
  return getExistingSoundFilesOfUser(userId);
}

export function getJoinsoundReadableStreamOfUser(target: JoinsoundTarget) {
  return createReadStream(getFilename(target));
}
