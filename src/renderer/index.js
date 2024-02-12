let selectVideosBtn = document.getElementById('selectVideosBtn')
let encoderSelect = document.getElementById('encoderSelect')
let fileSizeInpt = document.getElementById('fileSizeInpt')
let compressBtn = document.getElementById('compressBtn')
let abortBtn = document.getElementById('abortBtn')
let infoBox = document.getElementById('infoBox')
let appVersion = document.getElementById('appVersion')

compressBtn.disabled = true
abortBtn.disabled = true

window.addEventListener('DOMContentLoaded', async function () {
  appVersion.innerText = `v${await window.app.getVersion()}`

  // Load encoders
  let encoders = await window.ffmpeg.getEncoders()

  for (const name in encoders) {
    let encoder = encoders[name]
    let option = document.createElement('option')
    option.value = name
    option.innerText = encoder.displayName
    option.selected = encoder.default
    encoderSelect.appendChild(option)
  }
})

selectVideosBtn.addEventListener('click', async function () {
  window.logger.status('renderer', 'selectVideosBtn clicked')
  var files = await window.ffmpeg.promptVideoSelection()
  selectVideosBtn.value = files
  window.logger.debug('renderer', { files })

  compressBtn.disabled = false
  abortBtn.disabled = true
})

compressBtn.addEventListener('click', async function () {
  window.logger.status('renderer', 'compressBtn clicked')
  let files = selectVideosBtn.value.split(',')
  let encoder = encoderSelect.value
  let size = fileSizeInpt.value
  window.logger.debug('renderer', { files, encoder, size })

  await window.ffmpeg.start(files, encoder, size)

  selectVideosBtn.disabled = true
  encoderSelect.disabled = true
  fileSizeInpt.disabled = true
  compressBtn.disabled = true
  abortBtn.disabled = false
})

abortBtn.addEventListener('click', async function () {
  window.logger.status('renderer', 'abortBtn clicked')
  await window.ffmpeg.abort()

  selectVideosBtn.value = []
  selectVideosBtn.disabled = false
  encoderSelect.disabled = false
  fileSizeInpt.disabled = false
  compressBtn.disabled = true
  abortBtn.disabled = true
})

window.ffmpeg.onStart(function ({ pos, length }) {
  window.logger.status('renderer', 'ffmpeg started')
  infoBox.innerText = `0/${length}`
})

window.ffmpeg.onWalk(function ({ pos, length }) {
  window.logger.status('renderer', 'ffmpeg walked')
  infoBox.innerText = `${pos}/${length}`
})

window.ffmpeg.onFinish(function ({ pos, length }) {
  window.logger.status('renderer', 'ffmpeg finished')
  infoBox.innerText = `${pos}/${length} Finished`

  selectVideosBtn.value = []
  selectVideosBtn.disabled = false
  encoderSelect.disabled = false
  fileSizeInpt.disabled = false
  compressBtn.disabled = true
  abortBtn.disabled = true

  setTimeout(() => {
    infoBox.innerText = ''
  }, 3000)
})
