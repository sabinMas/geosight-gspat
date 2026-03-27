import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const cesiumBuildRoot = path.join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const publicCesiumRoot = path.join(projectRoot, "public", "cesium");
const directories = ["Workers", "Assets", "Widgets", "ThirdParty"];

if (!existsSync(cesiumBuildRoot)) {
  throw new Error(`Cesium build directory not found at ${cesiumBuildRoot}`);
}

mkdirSync(publicCesiumRoot, { recursive: true });

for (const directory of directories) {
  cpSync(
    path.join(cesiumBuildRoot, directory),
    path.join(publicCesiumRoot, directory),
    { recursive: true, force: true },
  );
}
