const pkg = require('./package.json')

module.exports = {
  packagerConfig: {
    asar: true,
    // icon: './test_icon.ico',
    executableName: pkg.readableName,
    name: pkg.readableName,
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
