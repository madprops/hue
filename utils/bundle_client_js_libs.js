const fs = require("fs")

let dir_path = "../public/static/js/libs/"
let dir_path_target = "../public/static/js/build/"
let bundle = ""
let manual = ["jquery.min.js"]
let files = fs.readdirSync(dir_path)

for (let file of manual) {
    bundle += fs.readFileSync(`${dir_path}${file}`, "utf8") + "\n"
}

for (let file of files) {
    if (manual.includes(file) || !file.endsWith(".js") || file === "libs.bundle.js") {
        continue
    }

    bundle += fs.readFileSync(`${dir_path}${file}`, "utf8") + "\n"
}

fs.writeFileSync(`${dir_path_target}libs.bundle.js`, bundle, "utf8")