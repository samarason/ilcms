// Force Next.js to use WebAssembly SWC (@next/swc-wasm-nodejs) instead of downloading
// 100MB+ native binaries (@next/swc-linux-x64-gnu / musl)
if (!process.versions.webcontainer) {
  process.versions.webcontainer = "1";
}
