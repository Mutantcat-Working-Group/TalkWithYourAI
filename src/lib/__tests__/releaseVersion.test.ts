import { describe, expect, it } from 'vitest'
import ciWorkflowSource from '../../../.github/workflows/ci.yml?raw'
import appImageVerificationScriptSource from '../../../.github/scripts/verify-appimage-runtime-libraries.sh?raw'
import appImagePluginWrapperSource from '../../../.github/scripts/linuxdeploy-plugin-appimage-exclude-wrapper.sh?raw'
import linuxdeployPrepareScriptSource from '../../../.github/scripts/prepare-linuxdeploy-wrapper.sh?raw'
import linuxdeployWrapperSource from '../../../.github/scripts/linuxdeploy-exclude-wrapper.rs?raw'
import constantsSource from '../constants.ts?raw'

describe('release version wiring', () => {
  it('lets frontend builds read the release tag version from Vite env', () => {
    expect(constantsSource).toContain('import.meta.env.VITE_APP_VERSION')
  })

  it('builds Linux arm64 release artifacts on a native runner', () => {
    expect(ciWorkflowSource).toContain('platform: ubuntu-22.04-arm')
    expect(ciWorkflowSource).toContain('target: aarch64-unknown-linux-gnu')
  })

  it('excludes the bundled Wayland client from Linux AppImages', () => {
    expect(ciWorkflowSource).toContain('Test Linux AppImage packaging guards')
    expect(ciWorkflowSource).toContain('./.github/scripts/test-linux-appimage-packaging.sh')
    expect(linuxdeployPrepareScriptSource).toContain('linuxdeploy-exclude-wrapper.rs')
    expect(linuxdeployPrepareScriptSource).toContain(
      'linuxdeploy-plugin-appimage-exclude-wrapper.sh',
    )
    expect(linuxdeployWrapperSource).toContain('--exclude-library')
    expect(linuxdeployWrapperSource).toContain('libwayland-client.so*')
    expect(appImagePluginWrapperSource).toContain("-name 'libwayland-client.so*' -delete")
  })

  it('rejects a release AppImage that still contains the Wayland client', () => {
    expect(appImageVerificationScriptSource).toContain('--appimage-extract')
    expect(appImageVerificationScriptSource).toContain("-name 'libwayland-client.so*'")
  })
})
