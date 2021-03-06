// Loads a Javascript file from a specified URL
// Resolves a promise when the <script> is loaded
Hue.load_script = function (source) {
  if (!Hue.load_scripts) {
    return false
  }

  Hue.loginfo(`Loading script: ${source}`)

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    document.body.appendChild(script)
    script.onload = resolve
    script.onerror = reject
    script.async = true
    script.src = source
  })
}