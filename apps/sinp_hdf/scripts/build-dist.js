const fs = require("node:fs/promises");
const path = require("node:path");
const { transform } = require("esbuild");
const { minify } = require("html-minifier-terser");

const APP_ROOT = path.resolve(__dirname, "..");
const APPS_ROOT = path.resolve(APP_ROOT, "..");
const DIST_ROOT = path.join(APP_ROOT, "dist");

const DIRECTORIES_TO_PACKAGE = [
  "addons",
  "custom_scripts",
  "customcontrols",
  "customlayers",
  "custom_theme",
  "data",
  "templates",
];

const ROOT_FILES_TO_PACKAGE = ["sinp_hdf.json", "sinp_hdf.xml"];

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
    format: "iife",
    minify: true,
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

async function packageDirectory(relativeDirectory) {
  const sourceDirectory = path.join(APP_ROOT, relativeDirectory);
  const files = await walkFiles(sourceDirectory);

  await Promise.all(
    files
      .filter((filePath) => !shouldSkipFile(filePath))
      .map((sourcePath) => {
        const relativePath = path.relative(APP_ROOT, sourcePath);
        const destinationPath = path.join(DIST_ROOT, relativePath);
        return transformFile(sourcePath, destinationPath);
      })
  );
}

async function packageRootFile(fileName) {
  const sourcePath = path.join(APPS_ROOT, fileName);
  const destinationPath = path.join(DIST_ROOT, fileName);
  await transformFile(sourcePath, destinationPath);
}

async function main() {
  await ensureCleanDir(DIST_ROOT);

  await Promise.all(DIRECTORIES_TO_PACKAGE.map((directory) => packageDirectory(directory)));
  await Promise.all(ROOT_FILES_TO_PACKAGE.map((fileName) => packageRootFile(fileName)));

  console.log(`Production package generated in ${DIST_ROOT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
