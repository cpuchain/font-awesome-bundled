# Font Awesome Bundled

[![NPM Version](https://img.shields.io/npm/v/font-awesome-bundled)](https://www.npmjs.com/package/font-awesome-bundled)

Font Awesome icons with fonts bundled in base64

### Features

Only Font Awesome 6 free icons ( with solid and brand icons ) are bundled as `./all.css`.

https://fontawesome.com/search?o=r&s=solid%2Cregular%2Cbrands

Bundled version gives convenience to handle the required file with a single file format, so that even if you bundle HTML or use any other bundlers like Webpack the font file wouldn't run away but instead remain bundled as base64 encoding which the browser would be able to understand and render those.

You can checkout [./example.html](./example.html) to see if the fonts are working correctly.

### How it is bundled

You can check `./scripts/sync.ts` of how the bundling is processed.

We use [PostCSS](https://postcss.org/) to bundle the CSS file.

### Credits to

https://github.com/FortAwesome/Font-Awesome/issues/294

https://github.com/jsweb/font-awesome-base64

https://github.com/keithorbit/font-awesome-base64
