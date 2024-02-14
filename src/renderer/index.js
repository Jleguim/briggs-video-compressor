let selectVideosBtn = document.getElementById('selectVideosBtn')
let encoderSelect = document.getElementById('encoderSelect')
let fileSizeInpt = document.getElementById('fileSizeInpt')
let compressBtn = document.getElementById('compressBtn')
let abortBtn = document.getElementById('abortBtn')
let infoBox = document.getElementById('infoBox')
let appVersion = document.getElementById('appVersion')
let folderBtn = document.getElementById('folderBtn')

compressBtn.disabled = true
abortBtn.disabled = true

var settings

window.addEventListener('DOMContentLoaded', async function () {
  appVersion.innerText = `v${await window.app.getVersion()}`
  // Load encoders
  let encoders = await window.ffmpeg.getEncoders()
  settings = await window.settingsapi.get()

  for (const encoder in encoders) {
    let name = encoders[encoder]
    let option = document.createElement('option')
    option.value = encoder
    option.innerText = name
    option.selected = encoder == settings.encoder
    encoderSelect.appendChild(option)
  }
})

encoderSelect.addEventListener('change', async function () {
  if (settings.encoder == encoderSelect.value) return
  settings.encoder = encoderSelect.value
  await window.settingsapi.save(settings)
})

selectVideosBtn.addEventListener('click', async function () {
  window.logger.status('renderer', 'selectVideosBtn clicked')
  var files = await window.ffmpeg.promptVideoSelection()
  if (!files) return
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
  let output = settings.out
  window.logger.debug('renderer', { files, encoder, size, output })

  await window.ffmpeg.start(files, encoder, size, output)

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

folderBtn.addEventListener('click', async function () {
  var folders = await window.settingsapi.promptDirectorySelection()
  if (!folders) return
  var folderPath = folders[0]

  if (settings.out == folderPath) return

  settings.out = folderPath
  await window.settingsapi.save(settings)
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
