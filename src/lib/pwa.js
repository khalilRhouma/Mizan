import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

// Talks to the service worker (src/sw.js): register it, count the saves that
// wait on the phone, and ask it to send them now.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
  // When the app opens (or comes back to the front), try to send waiting saves.
  navigator.serviceWorker.ready.then(() => syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
  window.addEventListener('online', () => syncNow())
}

function post(message) {
  navigator.serviceWorker?.controller?.postMessage(message)
}

export function syncNow() {
  post({ type: 'MIZAN_SYNC' })
}

/** Number of saves waiting on the phone (0 when there is no service worker). */
export function usePendingSaves() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    const onMessage = (event) => {
      if (event.data?.type === 'MIZAN_PENDING') setCount(event.data.count)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    navigator.serviceWorker.ready.then(() => post({ type: 'MIZAN_PENDING' }))
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])
  return count
}

/** True when a save answer means "kept on the phone, not sent yet". */
export function isQueued(result) {
  return Boolean(result?.queued)
}
