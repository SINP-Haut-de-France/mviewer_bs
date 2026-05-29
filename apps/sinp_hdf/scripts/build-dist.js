const fs = require("node:fs/promises");
const path = require("node:path");
const { transform } = require("esbuild");
const { minify } = require("html-minifier-terser");

const APP_ROOT = path.resolve(__dirname, "..");
const APPS_ROOT = path.resolve(APP_ROOT, "..");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const DIST_APPS_ROOT = path.join(DIST_ROOT, "apps");
const DIST_APP_ROOT = path.join(DIST_APPS_ROOT, "sinp_hdf");

const DIRECTORIES_TO_PACKAGE = [
  "addons",
  "custom_scripts",
  "customcontrols",
  "customlayers",
  "custom_theme",
  "data",
  "templates",
];

const ROOT_FILES_TO_PACKAGE = [
  "accueil.html",
  "default.xml",
  "settings.json",
  "sinp_hdf.json",
  "sinp_hdf.xml",
];

const MARKUP_IGNORE_FRAGMENTS = [/\{\{[\s\S]*?\}\}/, /<%[\s\S]*?%>/, /\$\{[\s\S]*?\}/];

async function ensureCleanDir(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
  await fs.mkdir(directoryPath, { recursive: true });
}

async function walkFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }
      return [fullPath];
    })
  );

  return files.flat();
}

function shouldSkipFile(filePath) {
  const normalizedPath = filePath.split(path.sep).join("/");
  return normalizedPath.endsWith(".map");
}

async function minifyJavaScript(source) {
  const result = await transform(source, {
    loader: "js",
    minifySyntax: true,
    minifyWhitespace: true,
    minifyIdentifiers: false,
    legalComments: "none",
    charset: "utf8",
  });

  return result.code;
}

async function minifyCss(source) {
  const result = await transform(source, {
    loader: "css",
    minify: true,
    legalComments: "none",
    charset: "utf8",
  });

  return result.code;
}

async function minifyMarkup(source) {
  return minify(source, {
    caseSensitive: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    keepClosingSlash: true,
    removeComments: true,
    removeAttributeQuotes: false,
    ignoreCustomFragments: MARKUP_IGNORE_FRAGMENTS,
  });
}

function minifyXml(source) {
  return source
    .replace(/>\s+</g, "><")
    .replace(/\r?\n/g, "")
    .replace(/\t+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function minifyJson(source, filePath) {
  try {
    return JSON.stringify(JSON.parse(source));
  } catch (error) {
    throw new Error(`Unable to minify JSON file ${filePath}: ${error.message}`);
  }
}

async function transformFile(sourcePath, destinationPath) {
  const extension = path.extname(sourcePath).toLowerCase();
  const isTextFile = [
    ".js",
    ".css",
    ".json",
    ".html",
    ".mst",
    ".xml",
    ".svg",
  ].includes(extension);

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  if (!isTextFile) {
    await fs.copyFile(sourcePath, destinationPath);
    return;
  }

  const source = await fs.readFile(sourcePath, "utf8");

  let output;
  switch (extension) {
    case ".js":
      output = await minifyJavaScript(source);
      break;
    case ".css":
      output = await minifyCss(source);
      break;
    case ".json":
      output = minifyJson(source, sourcePath);
      break;
    case ".html":
    case ".mst":
      output = await minifyMarkup(source);
      break;
    case ".xml":
    case ".svg":
      output = minifyXml(source);
      break;
    default:
      output = source;
      break;
  }

  await fs.writeFile(destinationPath, output, "utf8");
}

async function writeAddonEntrypointAlias(sourcePath, destinationPath) {
  const normalizedSourcePath = sourcePath.split(path.sep).join("/");
  const addonEntrypointPattern = /\/addons\/[^/]+\/[^/]+\.js$/;

  if (!addonEntrypointPattern.test(normalizedSourcePath)) {
    return;
  }

  const extensionlessPath = destinationPath.slice(0, -path.extname(destinationPath).length);
  await fs.copyFile(destinationPath, extensionlessPath);
}

async function packageDirectory(relativeDirectory) {
  const sourceDirectory = path.join(APP_ROOT, relativeDirectory);
  const files = await walkFiles(sourceDirectory);

  await Promise.all(
    files
      .filter((filePath) => !shouldSkipFile(filePath))
      .map(async (sourcePath) => {
        const relativePath = path.relative(APPS_ROOT, sourcePath);
        const destinationPath = path.join(DIST_APPS_ROOT, relativePath);
        await transformFile(sourcePath, destinationPath);
        await writeAddonEntrypointAlias(sourcePath, destinationPath);
      })
  );
}

async function packageRootFile(fileName) {
  const sourcePath = path.join(APPS_ROOT, fileName);
  const destinationPath = path.join(DIST_APPS_ROOT, fileName);
  await transformFile(sourcePath, destinationPath);
}

async function main() {
  await ensureCleanDir(DIST_ROOT);
  await fs.mkdir(DIST_APP_ROOT, { recursive: true });

  await Promise.all(DIRECTORIES_TO_PACKAGE.map((directory) => packageDirectory(directory)));
  await Promise.all(ROOT_FILES_TO_PACKAGE.map((fileName) => packageRootFile(fileName)));

  console.log(`Production package generated in ${DIST_ROOT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
