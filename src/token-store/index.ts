import * as path from 'path';

import { createFileTokenStore } from './file/file-token-store';
import { getProfileDir, tokenFile } from '../utils';
import { TokenStore } from './token-store';

export * from './token-store';

// For now, every OS uses file based storage

let store: TokenStore;

const tokenFilePath = path.join(getProfileDir(), tokenFile);
store = createFileTokenStore(tokenFilePath);
export const tokenStore = store;
