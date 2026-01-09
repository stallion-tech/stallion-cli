import path from "path";
import fs from "fs/promises";

export type ArtifactVariant = "normal" | "hermes";

export async function keepArtifacts(
  contentRootPath: string,
  platform: string,
  variant: ArtifactVariant = "normal"
) {
  const artifactsRoot = path.join(process.cwd(), "stallion-artifacts");
  const artifactsPath = path.join(artifactsRoot, platform, variant);
  await fs.mkdir(artifactsPath, { recursive: true });

  const bundleName =
    platform === "ios" ? "main.jsbundle" : `index.android.bundle`;

  if (variant === "normal") {
    // `assets` is a directory (RN bundle output), so `copyFile` will fail. Use a directory-safe copy.
    await copyPathIfExists(
      path.join(contentRootPath, "bundles", "assets"),
      path.join(artifactsPath, "assets")
    );
  }

  // Bundle: for "normal" this is the JS bundle; for "hermes" this is the bytecode bundle (after Hermes replaces it).
  await copyFileIfExists(
    path.join(contentRootPath, "bundles", bundleName),
    path.join(artifactsPath, bundleName)
  );

  if (variant === "normal") {
    // Normal (packager) sourcemap (only exists when sourcemap generation is enabled).
    await copyFileIfExists(
      path.join(contentRootPath, "sourcemaps", bundleName + ".map"),
      path.join(artifactsPath, bundleName + ".map")
    );
  } else {
    // Hermes sourcemap is emitted next to outputFolder as "<bundle>.hbc.map" by hermesc.
    // Some setups may move it elsewhere; keep a fallback for older paths.
    await copyFileIfExists(
      path.join(contentRootPath, bundleName + ".hbc.map"),
      path.join(artifactsPath, bundleName + ".hbc.map")
    );
    await copyFileIfExists(
      path.join(contentRootPath, "sourcemaps", bundleName + ".hbc.map"),
      path.join(artifactsPath, bundleName + ".hbc.map")
    );
  }
}

export async function copyFileIfExists(src: string, dest: string) {
    try {
        await fs.copyFile(src, dest);
    } catch (e: any) {
        if (e?.code === "ENOENT") return;
        throw e;
    }
}

export async function copyPathIfExists(src: string, dest: string) {
    try {
        const st = await fs.lstat(src);
        if (!st.isDirectory()) {
            await fs.copyFile(src, dest);
            return;
        }

        // Prefer `fs.cp` when available (Node >= 16.7). Fallback for older runtimes.
        const cp = (fs as any).cp as undefined | ((src: string, dest: string, opts: any) => Promise<void>);
        if (typeof cp === "function") {
            await cp(src, dest, { recursive: true, force: true });
            return;
        }

        await copyDirRecursive(src, dest);
    } catch (e: any) {
        if (e?.code === "ENOENT") return;
        throw e;
    }
}

export async function copyDirRecursive(srcDir: string, destDir: string) {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirRecursive(srcPath, destPath);
            continue;
        }

        if (entry.isSymbolicLink()) {
            const link = await fs.readlink(srcPath);
            try {
                await fs.symlink(link, destPath);
            } catch (e: any) {
                // If it already exists, replace it.
                if (e?.code === "EEXIST") {
                    await fs.rm(destPath, { force: true, recursive: true });
                    await fs.symlink(link, destPath);
                    continue;
                }
                throw e;
            }
            continue;
        }

        await fs.copyFile(srcPath, destPath);
    }
}