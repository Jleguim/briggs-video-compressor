window.app.ffmpeg.whenStarted(updateInfoBox)
window.app.ffmpeg.onUpdate(updateInfoBox)
window.app.ffmpeg.whenFinished(handleFFmpegFinish)

function updateInfoBox(data) {
  // var progressMap = data.tasks.map((f) => `${f.progress}%`)
  // infoBox.innerText = progressMap.join(',')

  var completedTasks = data.tasks.filter((t) => t.progress >= 100).length
  infoBox.innerText = `${completedTasks}/${data.tasks.length}`
}

function handleFFmpegFinish(data) {
  updateInfoBox(data)

  selectVideosBtn.value = []
  selectVideosBtn.disabled = false
  encoderSelect.disabled = false
  fileSizeInpt.disabled = false
  compressBtn.disabled = true
  abortBtn.disabled = true
}
