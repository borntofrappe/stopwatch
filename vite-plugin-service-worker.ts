import type { Plugin } from "vite";
import { createHash } from "crypto";
import { posix } from "path";

export default function ViteServiceWorker({
  importPrefix = "service-worker:",
  output = "service-worker.js",
  include = ["."],
} = {}): Plugin {
  return {
    name: "service-worker",
    async resolveId(id, importer) {
      if (!id.startsWith(importPrefix)) return;
      const plainId = id.slice(importPrefix.length);
      const result = await this.resolve(plainId, importer);
      if (!result) return;

      return importPrefix + result.id;
    },
    load(id) {
      if (!id.startsWith(importPrefix)) return;

      const fileId = this.emitFile({
        type: "chunk",
        id: id.slice(importPrefix.length),
        fileName: output,
      });

      return `export default import.meta.ROLLUP_FILE_URL_${fileId};`;
    },
    generateBundle(options, bundle) {
      const serviceWorkerChunk = bundle[output];

      const cacheChunks = Object.values(bundle).filter(
        (item) => item !== serviceWorkerChunk
      );

      const cacheURLs = [
        ...include,
        ...cacheChunks.map((item) =>
          posix.relative(posix.dirname(output), item.fileName)
        ),
      ];
      const ASSETS = JSON.stringify(cacheURLs);

      const versionHash = createHash("sha1");
      for (const item of cacheChunks) {
        // @ts-ignore
        versionHash.update(item.code || item.source);
      }
      const VERSION = JSON.stringify(versionHash.digest("hex"));

      // @ts-ignore
      serviceWorkerChunk.code = `const VERSION = ${VERSION};const ASSETS = ${ASSETS};${serviceWorkerChunk.code}`;
    },
  };
}
