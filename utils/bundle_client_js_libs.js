const fs = require("fs")
const Terser = require("terser")

let dir_path = "../public/static/js/libs/"
let dir_path_target = "../public/static/js/build/"
let minified = ""
let manual = ["jquery.min.js"]
let files = fs.readdirSync(dir_path)

for(let file of manual)
{
    let content = fs.readFileSync(`${dir_path}${file}`, "utf8")
    minified += Terser.minify(content).code
}

for(let file of files)
{
    if(manual.includes(file) || !file.endsWith(".js") || file === "libs.bundle.min.js")
    {
        continue
    }

    let content = fs.readFileSync(`${dir_path}${file}`, "utf8")
    minified += Terser.minify(content).code + "\n"
}

fs.writeFileSync(`${dir_path_target}libs.bundle.min.js`, minified, "utf8")