let drag_container = document.querySelector('#drag-files')

drag_container.addEventListener('drop', async (e) => {
  e.preventDefault()
  e.stopPropagation()

  let files = []
  let extensions = ['mkv', 'avi', 'mp4']

  for (const file of e.dataTransfer.files) {
    let valid = false
    extensions.forEach((extension) => {
      if (file.path.endsWith(extension)) valid = true
    })

    if (valid) files.push(file.path)
  }

  if (files.length === 0) return leftDrop()

  compressBtn.disabled = false
  abortBtn.disabled = true

  selectVideosBtn.value = files

  window.logger.debug('renderer', { files })
  leftDrop()
  await window.app.save(settings)
})

drag_container.addEventListener('dragover', (e) => {
  e.preventDefault()
  e.stopPropagation()
})

document.addEventListener('dragenter', (e) => {
  window.logger.status('renderer', 'File(s) are being dragged')
  drag_container.classList.add('active')
})

document.addEventListener('dragleave', (e) => {
  window.logger.status('renderer', 'File(s) left drop area')
  drag_container.classList.remove('active')
})
