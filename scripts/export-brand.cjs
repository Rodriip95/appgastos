/* eslint-disable @typescript-eslint/no-require-imports -- script CommonJS de Node */
// Keep downloadable artwork in sync with the React brand components.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/components/brand/Bingo.tsx"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const brand = { exports: {} };
const brandRequire = (id) => id === "@/lib/utils" ? { cn: (...values) => values.filter(Boolean).join(" ") } : require(id);
new Function("require", "module", "exports", compiled)(brandRequire, brand, brand.exports);
const { BingoDog, BingoMark, BingoWordmark } = brand.exports;
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const assets = {
  "brand/bingo.svg": render(BingoDog),
  "brand/bingo-billetera.svg": render(BingoDog, { variant: "wallet", title: "Bingo con tu billetera" }),
  "brand/bingo-cabeza.svg": render(BingoMark),
  "brand/bingo-wordmark.svg": render(BingoWordmark).replace(/ class="[^"]*"/g, ""),
};
const head = assets["brand/bingo-cabeza.svg"].replace(/<svg[^>]*>/, "").replace(/<\/svg>$/, "");
assets["icon.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#f7dec2"/><g transform="translate(48 18) scale(1.35)">${head}</g></svg>`;
for (const [file, svg] of Object.entries(assets)) {
  fs.writeFileSync(path.join(root, "public", file), svg + "\n");
}
console.log(`Exported ${Object.keys(assets).length} Bingo assets.`);
