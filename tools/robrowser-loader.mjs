// =============================================================================
// robrowser-loader — resolve roBrowser's bare specifiers under plain Node
// =============================================================================
// roBrowser's source imports `Core/Configs.js`, `Utils/BinaryWriter.js` and so
// on. In a browser those come from an import map; under Vite, from an alias
// config; in the packaged Electron app, from a rewrite in main.js. None of
// those exist when Node imports the files directly, which is what
// tools/check-client-protocol.mjs needs to do to test the packet layer without
// a GPU, a window or 4 GB of game data.
//
// A module resolve hook is the supported way to do that, and it touches
// nothing on disk — the submodule and the staged copy stay exactly as they are.
// =============================================================================

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ALIASES = [
	'App', 'Audio', 'Controls', 'Core', 'DB', 'Engine', 'Loaders',
	'Network', 'Plugins', 'Preferences', 'Renderer', 'UI', 'Utils', 'Vendors',
];

let srcRoot = null;

export function initialize(data) {
	srcRoot = data.srcRoot;
}

export async function resolve(specifier, context, next) {
	if (srcRoot) {
		const head = specifier.split('/')[0];
		if (ALIASES.includes(head)) {
			return {
				url: pathToFileURL(path.join(srcRoot, specifier)).href,
				shortCircuit: true,
			};
		}
		if (specifier.startsWith('src/')) {
			return {
				url: pathToFileURL(path.join(srcRoot, specifier.slice(4))).href,
				shortCircuit: true,
			};
		}
	}
	return next(specifier, context);
}
