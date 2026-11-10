import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpdatePrompt } from '../UpdatePrompt'

const { mockCheckForUpdate, mockOpenUrl } = vi.hoisted(() => ({
  mockCheckForUpdate: vi.fn(),
  mockOpenUrl: vi.fn(),
}))

vi.mock('../../lib/tauri', () => ({
  checkForUpdate: mockCheckForUpdate,
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: mockOpenUrl,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      defaultTextOrValues?: string | Record<string, string>,
      valuesArg?: Record<string, string>,
    ) => {
      const values = typeof defaultTextOrValues === 'object' ? defaultTextOrValues : valuesArg
      return (
        (
          {
            'updates.availableTitle': 'Update available',
            'updates.availableBody': `Version ${values?.version ?? ''} has been released. Download it from GitHub Releases.`,
            'updates.openRelease': 'Open release page',
            'updates.dismiss': 'Dismiss',
          } as Record<string, string>
        )[key] ?? key
      )
    },
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UpdatePrompt', () => {
  it('stays hidden when no newer release exists', async () => {
    mockCheckForUpdate.mockResolvedValueOnce(null)

    render(<UpdatePrompt />)

    await waitFor(() => expect(mockCheckForUpdate).toHaveBeenCalled())
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
  })

  it('shows the release notice and opens the release page', async () => {
    mockCheckForUpdate.mockResolvedValueOnce({
      version: 'v1.0.20261118',
      url: 'https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/tag/v1.0.20261118',
    })

    render(<UpdatePrompt />)

    expect(await screen.findByText('Update available')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Version v1.0.20261118 has been released. Download it from GitHub Releases.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open release page' }))

    await waitFor(() =>
      expect(mockOpenUrl).toHaveBeenCalledWith(
        'https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/tag/v1.0.20261118',
      ),
    )
  })

  it('never installs anything itself', async () => {
    // The app must not offer a self-install action: the macOS build is ad-hoc
    // signed, so an update payload could not be verified.
    mockCheckForUpdate.mockResolvedValueOnce({
      version: 'v1.0.20261118',
      url: 'https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/tag/v1.0.20261118',
    })

    render(<UpdatePrompt />)

    await screen.findByText('Update available')
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument()
  })

  it('stays silent when the check fails', async () => {
    mockCheckForUpdate.mockRejectedValueOnce(new Error('offline'))

    render(<UpdatePrompt />)

    await waitFor(() => expect(mockCheckForUpdate).toHaveBeenCalled())
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
  })

  it('can be dismissed', async () => {
    mockCheckForUpdate.mockResolvedValueOnce({
      version: 'v1.0.20261118',
      url: 'https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/tag/v1.0.20261118',
    })

    render(<UpdatePrompt />)

    await screen.findByText('Update available')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
  })
})
