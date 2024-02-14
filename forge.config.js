const pkg = require('./package.json')

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './test_icon.ico',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        exe: `${pkg.readableName}.exe`,
        setupExe: `${pkg.readableName} v${pkg.version} Setup.exe`,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
}
