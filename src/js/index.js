let startBtn = document.getElementById('startBtn')
// let cancelBtn = document.getElementById('cancelBtn')
let uploadBtn = document.getElementById('uploadBtn')
let appVersion = document.getElementById('appVersion')
let encoderSelct = document.getElementById('encoderSelct')
let fileSizeInpt = document.getElementById('fileSizeInpt')

startBtn.disabled = true
// cancelBtn.disabled = true
var videos = []

async function startCompression() {
  let encoder = encoderSelct.value
  let sizeTarget = fileSizeInpt.value

  await window.ipc.beginCompression(videos, encoder, sizeTarget)
  await window.ipc.finishedCompression()

  uploadBtn.disabled = true
  startBtn.disabled = true
  fileSizeInpt.disabled = true
  encoderSelct.disabled = true
  // cancelBtn.disabled = false

  console.log('Encoder: ', encoder)
  console.log('Size: ', sizeTarget)
}

async function selectVideos() {
  videos = await window.ipc.promptVideoSelect()

  startBtn.disabled = false
  // cancelBtn.disabled = true

  console.log('Videos: ', videos)
}

// async function abortCompression() {
//   await window.ipc.abortCompression()

//   startBtn.disabled = true
//   cancelBtn.disabled = true
//   uploadBtn.disabled = false
//   encoderSelct.disabled = false
//   fileSizeInpt.disabled = false
// }

startBtn.addEventListener('click', startCompression)
// cancelBtn.addEventListener('click', abortCompression)
uploadBtn.addEventListener('click', selectVideos)
