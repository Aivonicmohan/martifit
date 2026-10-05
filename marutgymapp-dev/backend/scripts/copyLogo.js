const fs = require("fs");
const path = require("path");

const src = "/Users/apple/.gemini/antigravity-ide/brain/d4d44054-ea7a-46f4-a0fe-ade74bdfab12/marut_hanuman_antique_logo_1788104952776.png";
const publicDir = path.join(__dirname, "../../frontend/public");
const dest = path.join(publicDir, "marut_hanuman_logo.png");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log("Logo copied successfully to:", dest);
