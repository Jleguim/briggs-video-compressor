function updateInfoBox(data) {
  var progressMap = data.tasks.map((f) => `${f.progress}%`)
  infoBox.innerText = progressMap.join(',')
}

function handleStart(data) {
  window.logger.status('Renderer/ffmpeg.js', 'ffmpeg started')
  updateInfoBox(data)
}

function handleWalk(data) {
  //   window.logger.status('Renderer/ffmpeg.js', 'ffmpeg walked')
  updateInfoBox(data)
}

function handleFinish(data) {
  window.logger.status('Renderer/ffmpeg.js', 'ffmpeg finished')
  updateInfoBox(data)

  selectVideosBtn.value = []
  selectVideosBtn.disabled = false
  encoderSelect.disabled = false
  fileSizeInpt.disabled = false
  compressBtn.disabled = true
  abortBtn.disabled = true
}

window.ffmpeg.onStart(handleStart)
window.ffmpeg.onWalk(handleWalk)
window.ffmpeg.onFinish(handleFinish)
