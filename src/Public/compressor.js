window.addEventListener('DOMContentLoaded', main)

async function registerElements() {
  let elements = {
    _selectBtn: {
      events: {
        click: async (e) => {
          let _startBtn = document.getElementById('_startBtn')
          let prompt = await window.app.fileSelect({
            filters: [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }],
            properties: ['multiSelections'],
            defaultPath: window.settings.recent_path,
          })

          if (!prompt) return

          _startBtn.disabled = false
          e.target.value = prompt.selection

          window.settings.recent_path = prompt.dir
          await window.app.settings.set(window.settings)
        },
      },
    },
    _outputBtn: {
      events: {
        click: async () => {
          let prompt = await window.app.fileSelect({
            properties: ['openDirectory'],
            defaultPath: window.settings.out_path,
          })

          if (!prompt) return

          window.settings.out_path = prompt.selection[0]
          await window.app.settings.set(window.settings)
        },
      },
    },
    _startBtn: {
      startup: (element) => {
        element.disabled = true
      },
      events: {
        click: async (e) => {
          let _selectEncoder = document.getElementById('_selectEncoder')
          let _outputBtn = document.getElementById('_outputBtn')
          let _selectBtn = document.getElementById('_selectBtn')
          let _sizeInpt = document.getElementById('_sizeInpt')
          let _abortBtn = document.getElementById('_abortBtn')

          await window.app.ffmpeg.start({
            files: _selectBtn.value.split(','),
            encoder: _selectEncoder.value,
            size: _sizeInpt.value,
            output: window.settings.out_path,
          })

          e.target.disabled = true
          _selectEncoder.disabled = true
          _outputBtn.disabled = true
          _selectBtn.disabled = true
          _sizeInpt.disabled = true
          _abortBtn.disabled = false
        },
      },
    },
    _abortBtn: {
      startup: (element) => {
        element.disabled = true
      },
      events: {
        click: async (e) => {
          let _selectEncoder = document.getElementById('_selectEncoder')
          let _progressDiv = document.getElementById('_progressDiv')
          let _outputBtn = document.getElementById('_outputBtn')
          let _selectBtn = document.getElementById('_selectBtn')
          let _sizeInpt = document.getElementById('_sizeInpt')

          await window.app.ffmpeg.abort()

          e.target.disabled = true
          _selectEncoder.disabled = false
          _progressDiv.innerText = ''
          _outputBtn.disabled = false
          _selectBtn.disabled = false
          _sizeInpt.disabled = false
        },
      },
    },
    _selectEncoder: {
      startup: async (element) => {
        let encoders = await window.app.ffmpeg.getEncoders()
        Object.keys(encoders).forEach((encoder) => {
          let option = document.createElement('option')
          option.value = encoder
          option.innerText = encoders[encoder]
          option.selected = encoder == window.settings.encoder
          element.appendChild(option)
        })
      },
      events: {
        input: async (e) => {
          window.settings.encoder = e.target.value
          await window.app.settings.set(window.settings)
        },
      },
    },
    _appVersion: {
      startup: async (element) => {
        var appInfo = await window.app.getInfo()
        element.innerText = appInfo.version
      },
      events: {
        click: async () => {
          await window.app.openReleaseNotes()
        },
      },
    },
    _dragFiles: {
      startup: (element) => {
        document.addEventListener('dragenter', () => element.classList.remove('hidden'))
      },
      events: {
        drop: async (e) => {
          let _startBtn = document.getElementById('_startBtn')
          let _selectBtn = document.getElementById('_selectBtn')

          e.preventDefault()
          e.stopPropagation()

          let validExtensions = ['mkv', 'avi', 'mp4']
          let validFiles = Array.from(e.dataTransfer.files).filter((f) => {
            let split = f.path.split('.')
            let extension = split[split.length - 1]
            return validExtensions.includes(extension)
          })

          if (validFiles.length == 0) return e.target.parentElement.classList.add('hidden')

          _startBtn.disabled = false
          _selectBtn.value = validFiles.map((f) => (f = f.path))

          e.target.parentElement.classList.add('hidden')
        },
        dragover: (e) => {
          e.preventDefault()
          e.stopPropagation()
        },
        dragleave: (e) => {
          e.target.parentElement.classList.add('hidden')
        },
      },
    },
  }

  for (const id in elements) {
    const element = document.getElementById(id)
    const data = elements[id]

    if (data.startup) data.startup(element)

    for (const eventName in data.events) {
      const eventHandler = data.events[eventName]
      element.addEventListener(eventName, eventHandler)
    }
  }
}

async function main() {
  window.settings = await window.app.settings.get()
  await registerElements()

  window.app.ffmpeg.whenStarted(updateProgress)
  window.app.ffmpeg.onUpdate(updateProgress)
  window.app.ffmpeg.whenFinished(handleFFmpegFinish)

  function updateProgress(data) {
    let _progressDiv = document.getElementById('_progressDiv')

    // var progressMap = data.tasks.map((f) => `${f.progress}%`)
    // var progress = progressMap.join(',')

    var completedTasks = data.tasks.filter((t) => t.progress >= 100).length
    var progress = `${completedTasks}/${data.tasks.length}`

    _progressDiv.innerText = progress
  }

  function handleFFmpegFinish(data) {
    let _selectEncoder = document.getElementById('_selectEncoder')
    let _outputBtn = document.getElementById('_outputBtn')
    let _selectBtn = document.getElementById('_selectBtn')
    let _sizeInpt = document.getElementById('_sizeInpt')
    let _startBtn = document.getElementById('_startBtn')
    let _abortBtn = document.getElementById('_abortBtn')

    updateProgress(data)

    _selectBtn.value = []
    _selectBtn.disabled = false
    _selectEncoder.disabled = false
    _sizeInpt.disabled = false
    _outputBtn.disabled = false
    _startBtn.disabled = true
    _abortBtn.disabled = true
  }
}
