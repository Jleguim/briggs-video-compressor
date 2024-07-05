let selectVideosBtn = document.getElementById('selectVideosBtn')
let encoderSelect = document.getElementById('encoderSelect')
let fileSizeInpt = document.getElementById('fileSizeInpt')
let compressBtn = document.getElementById('compressBtn')
let abortBtn = document.getElementById('abortBtn')
let infoBox = document.getElementById('infoBox')
let appVersion = document.getElementById('appVersion')
let folderBtn = document.getElementById('folderBtn')

window.addEventListener('DOMContentLoaded', DOMContentLoaded)
encoderSelect.addEventListener('input', handleEncoderInput)

async function DOMContentLoaded() {
  window.settings = await window.app.settings.get()
  window.appInfo = await window.app.getInfo()

  appVersion.innerText = `v${window.appInfo.version}`

  let encoders = await window.app.ffmpeg.getEncoders()
  for (const encoder in encoders) {
    let encoder_name = encoders[encoder]
    let option = document.createElement('option')
    option.value = encoder
    option.innerText = encoder_name
    option.selected = encoder == window.settings.encoder
    encoderSelect.appendChild(option)
  }

  compressBtn.disabled = true
  abortBtn.disabled = true
}

async function handleEncoderInput() {
  window.settings.encoder = encoderSelect.value
  await window.app.settings.set(window.settings)
}

selectVideosBtn.addEventListener('click', handleSelectVideosBtnClick)
compressBtn.addEventListener('click', handleCompressBtnClick)
abortBtn.addEventListener('click', handleAbortBtnClick)
folderBtn.addEventListener('click', handleFolderBtnClick)
appVersion.addEventListener('click', handleAppVersionBtnClick)

async function handleSelectVideosBtnClick() {
  let prompt = await window.app.fileSelect({
    filters: [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }],
    properties: ['multiSelections'],
    defaultPath: window.settings.recent_path,
  })

  if (!prompt) return

  compressBtn.disabled = false
  abortBtn.disabled = true
  selectVideosBtn.value = prompt.selection
  window.settings.recent_path = prompt.dir

  await window.app.settings.set(window.settings)
}

async function handleCompressBtnClick() {
  var options = getCompressingOptions()
  await window.app.ffmpeg.start(options)
  // console.log(options)

  selectVideosBtn.disabled = true
  encoderSelect.disabled = true
  fileSizeInpt.disabled = true
  compressBtn.disabled = true
  abortBtn.disabled = false
}

function getCompressingOptions() {
  return {
    files: selectVideosBtn.value.split(','),
    encoder: encoderSelect.value,
    size: fileSizeInpt.value,
    output: window.settings.out_path,
  }
}

async function handleFolderBtnClick() {
  let prompt = await window.app.fileSelect({
    properties: ['openDirectory'],
    defaultPath: window.settings.recent_path,
  })

  if (!prompt) return

  window.app.settings.out_path = prompt.selection[0]
  await window.app.settings.set(window.settings)
}

async function handleAbortBtnClick() {
  // console.log('Abort')
  await window.app.ffmpeg.abort()

  selectVideosBtn.value = []
  selectVideosBtn.disabled = false
  encoderSelect.disabled = false
  fileSizeInpt.disabled = false
  compressBtn.disabled = true
  abortBtn.disabled = true

  infoBox.innerText = ''
}

async function handleAppVersionBtnClick() {
  await window.app.openBrowser(window.appInfo.releaseNotes)
}
