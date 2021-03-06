// Makes and prepares the textparser regexes
Hue.setup_textparser_regexes = function () {
  Hue.textparser_regexes = {}

  Hue.textparser_regexes[">"] = {}
  Hue.textparser_regexes[">"].regex = new RegExp("(?:^)((?:&gt;)+)(.*)", "gm")
  Hue.textparser_regexes[">"].replace_function = function (g1, g2, g3) {
    let m = g2.match(/&gt;/g)

    if (!m) {
      return
    }

    let num = m.length
    
    if (num === 1) {
      return `<div class='colortext greentext'>${g1}</div>`
    } else if (num === 2) {
      return `<div class='colortext bluetext'>${g1}</div>`
    } else {
      return `<div class='colortext redtext'>${g1}</div>`
    }
  }

  Hue.textparser_regexes["whisper_link"] = {}
  Hue.textparser_regexes["whisper_link"].regex = new RegExp(
    `\\[whisper\\s+(.*?)\\](.*?)\\[\/whisper\\]`,
    "gm"
  )
  Hue.textparser_regexes["whisper_link"].replace_function = function (
    g1,
    g2,
    g3
  ) {
    return `<span class="whisper_link special_link" data-whisper="${g2}" title="[Whisper] ${g2}">${g3.replace(/\s+/, "&nbsp;")}</span>`
  }

  Hue.textparser_regexes["anchor_link"] = {}
  Hue.textparser_regexes["anchor_link"].regex = new RegExp(
    `\\[anchor\\s+(.*?)\\](.*?)\\[\/anchor\\]`,
    "gm"
  )
  Hue.textparser_regexes["anchor_link"].replace_function = function (g1, g2, g3) {
    return `<a href="${g2}" class="stop_propagation anchor_link special_link" target="_blank">${g3.trim().replace(/\s+/, "&nbsp;")}</a>`
  }

  Hue.textparser_regexes["replies"] = {}
  Hue.textparser_regexes["replies"].regex = new RegExp(`(\\w+) said: `, "gm")
  Hue.textparser_regexes["replies"].replace_function = function (g1, g2, g3) {
    return `<div class='chat_reply_username action'>${g2}</div> said: `
  }
}

// Passes text through all textparser regexes doing the appropiate replacements
Hue.parse_text = function (text, checklines = true) {
  text = text.replace(
    Hue.textparser_regexes["whisper_link"].regex,
    Hue.textparser_regexes["whisper_link"].replace_function
  )

  text = text.replace(
    Hue.textparser_regexes["anchor_link"].regex,
    Hue.textparser_regexes["anchor_link"].replace_function
  )

  text = text.replace(
    Hue.textparser_regexes["replies"].regex,
    Hue.textparser_regexes["replies"].replace_function
  )

  text = text.replace(
    Hue.textparser_regexes[">"].regex,
    Hue.textparser_regexes[">"].replace_function
  )

  if (checklines && text.includes("\n")) {
    text = `<div class='codeblock'>${text}</div>`
  }

  return text
}