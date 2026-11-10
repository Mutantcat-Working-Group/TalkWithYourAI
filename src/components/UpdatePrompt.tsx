import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { checkForUpdate, type AvailableRelease } from '../lib/tauri'
import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * "A newer release exists" notice.
 *
 * This app does not self-update: macOS builds are ad-hoc signed and there is no
 * maintainer signing key, so an auto-update payload could not be verified.
 * The notice only tells the user a newer GitHub release exists and opens the
 * release page; the user installs it themselves.
 */
export function UpdatePrompt() {
  const { t } = useTranslation()
  const [release, setRelease] = useState<AvailableRelease | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    checkForUpdate()
      .then((available) => {
        if (!cancelled && available) setRelease(available)
      })
      .catch((error) => {
        // A failed check is never user-visible; offline is normal.
        console.warn('Failed to check for updates:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!release || dismissed) return null

  return (
    <div
      className="fixed right-4 bottom-4 z-[9998] w-[min(360px,calc(100vw-32px))] rounded-[8px] border border-border bg-bg-secondary p-4 shadow-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-accent/10 text-accent">
          <Download size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary">
                {t('updates.availableTitle', 'Update available')}
              </h2>
              <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                {t(
                  'updates.availableBody',
                  'Version {{version}} has been released. Download it from GitHub Releases.',
                  { version: release.version },
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border border-transparent text-text-tertiary transition-colors hover:border-border hover:text-text-primary"
              aria-label={t('updates.dismiss', 'Dismiss')}
            >
              <X size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void openUrl(release.url).catch((error) => {
                console.warn('Failed to open the release page:', error)
              })
            }}
            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-[7px] bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Download size={14} />
            {t('updates.openRelease', 'Open release page')}
          </button>
        </div>
      </div>
    </div>
  )
}
