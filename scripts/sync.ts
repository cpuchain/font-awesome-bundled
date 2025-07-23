import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import postcss from 'postcss';
import postcssUrl from 'postcss-url';
import cssnano from 'cssnano';
import { lookup as mimeLookup } from 'mime-types';

// Paths for input and output
const inputCssPath = './node_modules/@fortawesome/fontawesome-free/css/all.css'; // Path to Font Awesome CSS
const outputCssPath = `./all.css`; // Path for bundled output
const outputCssPathMinified = `./all.min.css`; // Minified CSS output path
// Necessary font file patterns to include
const necessaryFonts = ['fa-regular-400', 'fa-solid-900', 'fa-brands-400'];

// Function to filter CSS rules to keep only regular and brand styles
function filterRelevantFontAwesomeCSS(css: string): string {
    // Remove references to solid style `.fa-solid`, `.fas`, and other excluded fonts
    //const unwantedRulesRegex = /\.fa-solid[^{]*\{[^}]*\}|\.fas[^{]*\{[^}]*\}|@font-face[^{]*\{[^}]*fa-solid-900[^}]*\}|@font-face[^{]*\{[^}]*'FontAwesome'[^}]*\}|@font-face[^{]*\{[^}]*'Font Awesome 5 [^}]*\}/g;
    const unwantedRulesRegex =
        /@font-face[^{]*\{[^}]*'FontAwesome'[^}]*\}|@font-face[^{]*\{[^}]*'Font Awesome 5 [^}]*\}/g;

    // Remove any `font-family: 'FontAwesome'` and `font-family: 'Font Awesome 5 *'` declarations
    const unwantedFontFamilyRegex = /font-family: ('FontAwesome'|'Font Awesome 5 [^';]*)[^;}]*[;}]/g;

    // Regular expression to remove `.ttf` file paths from `src` attributes in `@font-face`
    // eslint-disable-next-line no-useless-escape
    const excludeTtfRegex = /url\([^)]+\.ttf[^\)]*\)[^,]?/g;

    // Filter the CSS
    let filteredCss = css.replace(unwantedRulesRegex, '');
    filteredCss = filteredCss.replace(unwantedFontFamilyRegex, '');
    filteredCss = filteredCss.replace(excludeTtfRegex, '');
    return filteredCss;
}

// Utility function to fetch and encode files in Base64
async function fetchAndBase64(url: string, isLocal: boolean): Promise<string> {
    let buffer: Buffer;

    if (isLocal) {
        buffer = await readFile(url);
    } else {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
        }
        buffer = Buffer.from(await response.arrayBuffer());
    }

    const mimeType = mimeLookup(url) || 'application/octet-stream';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Helper function to format file size as human-readable
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2); // Two decimal places
    return `${size} ${sizes[i]}`;
}

// CSS Bundler Function
async function bundleCSS(inputCssPath: string, outputCssPath: string, minify = false) {
    let inputCss = await readFile(inputCssPath, { encoding: 'utf8' });

    // Filter out unnecessary rules (keep only regular and brand styles)
    if (inputCssPath.includes('fontawesome')) {
        inputCss = filterRelevantFontAwesomeCSS(inputCss);
    }

    // Plugin to bundle resources as Base64
    const bundlingPlugin = postcssUrl({
        url: async (asset: { url: string }) => {
            const isLocal = !asset.url.startsWith('http') && !asset.url.startsWith('//');
            let resourcePath = asset.url;

            if (
                inputCssPath.includes('fontawesome') &&
                !necessaryFonts.some((font) => resourcePath.includes(font))
            ) {
                return asset.url;
            }

            if (isLocal) {
                resourcePath = path.resolve(path.dirname(inputCssPath), asset.url);
            }

            try {
                return await fetchAndBase64(resourcePath, isLocal);
            } catch (err) {
                console.error(`Error bundling resource ${asset.url}:`, err);
                return asset.url; // Fallback to original URL on error
            }
        },
    });

    const plugins = [bundlingPlugin];
    if (minify) {
        // Add `cssnano` for minification
        plugins.push(
            cssnano({
                preset: 'default',
            }),
        );
    }

    // Run PostCSS with the plugins
    const result = await postcss(plugins).process(inputCss, { from: inputCssPath, to: outputCssPath });

    // Write the bundled CSS to the output file
    await writeFile(outputCssPath, result.css, { encoding: 'utf8' });
    const fileSize = formatFileSize(new TextEncoder().encode(result.css).byteLength);
    console.log(`CSS output (${minify ? 'minified' : 'regular'}) saved to ${outputCssPath} (${fileSize})`);
}

async function main() {
    try {
        await Promise.all([
            bundleCSS(inputCssPath, outputCssPath, false),
            bundleCSS(inputCssPath, outputCssPathMinified, true),
        ]);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}
main();
