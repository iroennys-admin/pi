export function getIropiUserAgent(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `iropi/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
