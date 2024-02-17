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

let settings

window.addEventListener('DOMContentLoaded', async function () {
  appVersion.innerText = `v${await window.app.getVersion()}`
  // Load encoders
  let encoders = await window.ffmpeg.getEncoders()
  settings = await window.app.get()

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
  window.logger.status('renderer', 'encoderSelect changed')
  if (settings.encoder == encoderSelect.value) return
  settings.encoder = encoderSelect.value
  await window.app.save(settings)
})

selectVideosBtn.addEventListener('click', async function () {
  window.logger.status('renderer', 'selectVideosBtn clicked')
  let prompt = await window.app.promptFileSelect(settings.lastInputPath)
  if (!prompt.files) return

  compressBtn.disabled = false
  abortBtn.disabled = true

  settings.lastInputPath = prompt.dir
  selectVideosBtn.value = prompt.files
  window.logger.debug('renderer', { files: prompt.files })
  await window.app.save(settings)
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
  window.logger.status('renderer', 'folderBtn clicked')
  let prompt = await window.app.promptDirSelect(settings.out)
  if (!prompt.dir) return

  if (settings.out == prompt.dir) return

  settings.out = prompt.dir
  await window.app.save(settings)
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
