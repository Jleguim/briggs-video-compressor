const pkg = require('./package.json')

module.exports = {
  packagerConfig: {
    asar: true,
    // icon: './test_icon.ico',
    executableName: 'Briggs Compressor',
    name: 'Briggs Compressor',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        exe: 'Briggs Compressor.exe',
        setupExe: `Briggs Compressor v${pkg.version} Setup.exe`,
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
