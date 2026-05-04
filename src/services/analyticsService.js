import { logEvent as firebaseLogEvent } from 'firebase/analytics'
import { analytics } from './firebase.js'

export const logEvent = (eventName, params = {}) => {
  try {
    if (analytics) firebaseLogEvent(analytics, eventName, params)
  } catch (err) {
    console.warn('[Analytics] Failed:', eventName, err)
  }
}

export const trackActiveUser = (userId) => logEvent('active_user', { user_id: userId })
export const trackMessageSent = (type) => logEvent('message_sent', { message_type: type })
export const trackStoryUploaded = (type) => logEvent('story_uploaded', { story_type: type })
export const trackPageView = (pageName) => logEvent('page_view', { page_name: pageName })
export const trackCallStarted = (type) => logEvent('call_started', { call_type: type })
export const trackSignUp = (method) => logEvent('sign_up', { method })
export const trackLogin = (method) => logEvent('login', { method })
