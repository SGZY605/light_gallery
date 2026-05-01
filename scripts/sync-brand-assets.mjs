import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicBrandDir = join(projectRoot, "public", "brand");

const brandAssets = [
  ["assets/gallery_light.png", "public/brand/gallery_light.png"],
  ["assets/gallery_dark.png", "public/brand/gallery_dark.png"],
  ["assets/gallery_logo.png", "public/brand/gallery_logo.png"],
  ["assets/login_background.png", "public/login_background.png"]
];

mkdirSync(publicBrandDir, { recursive: true });

for (const [sourcePath, targetPath] of brandAssets) {
  const source = join(projectRoot, sourcePath);
  const target = join(projectRoot, targetPath);

  if (!existsSync(source)) {
    throw new Error(`Missing brand asset: ${sourcePath}`);
  }

  copyFileSync(source, target);
}
