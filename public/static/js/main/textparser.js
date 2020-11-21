// Regex generator for character based textparser
Hue.make_textparser_char_regex = function (char, mode = 1) {
  if (mode === 1) {
    let regex = `(^|\\s)(${Hue.utilz.escape_special_characters(
      char
    )}+)(?!\\s)(.*[^${Hue.utilz.escape_special_characters(
      char
    )}\\s])\\2($|\\s|\\:|\\?|\\!)`
    return new RegExp(regex, "gm")
  } else if (mode === 2) {
    let regex = `(^|\\s)(${Hue.utilz.escape_special_characters(
      char
    )}+)(.*[^${Hue.utilz.escape_special_characters(
      char
    )}\\s])\\2($|\\s|\\:|\\?|\\!)`
    return new RegExp(regex, "gms")
  }
}

// Makes and prepares the textparser regexes
Hue.setup_textparser_regexes = function () {
  Hue.textparser_regexes = {}

  Hue.textparser_regexes["`"] = {}
  Hue.textparser_regexes["`"].regex = Hue.make_textparser_char_regex("`", 2)
  Hue.textparser_regexes["`"].replace_function = function (g1, g2, g3, g4, g5) {
    return `${g2}<div class='code'>${Hue.utilz.untab_string(g4)}</div>${g5}`
  }

  Hue.textparser_regexes["$"] = {}
  Hue.textparser_regexes["$"].regex = Hue.make_textparser_char_regex("$")
  Hue.textparser_regexes["$"].replace_function = function (g1, g2, g3, g4, g5) {
    let n = g3.length

    if (n === 1) {
      return `${g2}<span class='generic_uname action'>${g4}</span>${g5}`
    }

    return g1
  }

  Hue.textparser_regexes[">"] = {}
  Hue.textparser_regexes[">"].regex = new RegExp("^ *((?:&gt;)+).*", "gm")
  Hue.textparser_regexes[">"].replace_function = function (g1, g2) {
    let m = g2.match(/&gt;/g)

    if (!m) {
      return false
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

  Hue.textparser_regexes["horizontal_line"] = {}
  Hue.textparser_regexes["horizontal_line"].regex = new RegExp(
    `\\[line\\]`, "gm"
  )
  Hue.textparser_regexes["horizontal_line"].replace_function = function () {
    return "<hr class='chat_hr'>"
  }

  Hue.textparser_regexes["anchor_link"] = {}
  Hue.textparser_regexes["anchor_link"].regex = new RegExp(
    `\\[anchor\\s+(.*?)\\](.*?)\\[\/anchor\\]`,
    "gm"
  )
  Hue.textparser_regexes["anchor_link"].replace_function = function (g1, g2, g3) {
    return `<a href="${g2}" class="stop_propagation anchor_link special_link" target="_blank">${g3.trim().replace(/\s+/, "&nbsp;")}</a>`
  }
}

// Passes text through all textparser regexes doing the appropiate replacements
// It runs in recursion until no more replacements are found
// This is to allow replacements in any order
Hue.parse_text = function (text, filter = false) {
  if (filter) {
    text = text.replace(Hue.textparser_regexes["whisper_link"].regex, "")
    text = text.replace(Hue.textparser_regexes["anchor_link"].regex, "")
    text = text.replace(Hue.textparser_regexes["horizontal_line"].regex, "")
  } else {
    text = text.replace(
      Hue.textparser_regexes["whisper_link"].regex,
      Hue.textparser_regexes["whisper_link"].replace_function
    )
    text = text.replace(
      Hue.textparser_regexes["anchor_link"].regex,
      Hue.textparser_regexes["anchor_link"].replace_function
    )
    text = text.replace(
      Hue.textparser_regexes["horizontal_line"].regex,
      Hue.textparser_regexes["horizontal_line"].replace_function
    )
  }

  text = text.replace(
    Hue.textparser_regexes["`"].regex,
    Hue.textparser_regexes["`"].replace_function
  )

  text = text.replace(
    Hue.textparser_regexes["$"].regex,
    Hue.textparser_regexes["$"].replace_function
  )

  text = text.replace(
    Hue.textparser_regexes[">"].regex,
    Hue.textparser_regexes[">"].replace_function
  )

  return text
}

// Removes unwanted formatting from chat messages
Hue.remove_parsed_text_from_message = function (message) {
  message = message.replace(/\[.*?\](.+?)\[\/.*?\]/gm, function (a, b) {
    return b
  })

  return message
}