function updateInfoBox(data) {
  // var progressMap = data.tasks.map((f) => `${f.progress}%`)
  // infoBox.innerText = progressMap.join(',')

  var completedTasks = data.tasks.filter((t) => t.progress >= 100).length
  infoBox.innerText = `${completedTasks}/${data.tasks.length}`
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
