// Browser Notification API wrapper for new-message alerts, styled like WhatsApp's
// desktop/mobile web notifications (sender pic + name + preview).

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return Notification.permission
}

export const showMessageNotification = ({ title, body, icon, tag, onClick }) => {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const notification = new Notification(title, {
    body,
    icon: icon || '/icons.svg',
    tag,
    renotify: true,
    silent: false,
  })

  notification.onclick = () => {
    window.focus()
    if (onClick) onClick()
    notification.close()
  }
}
