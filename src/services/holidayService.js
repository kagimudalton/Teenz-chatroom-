// Detects the current holiday/season based on today's date and returns
// a lightweight decorative theme (particle emoji + accent) for the app to
// overlay on top of the user's chosen theme — never replacing their colors.

const HOLIDAYS = [
  { key: 'christmas', name: 'Christmas', particle: '❄️', from: [12, 20], to: [12, 26] },
  { key: 'newyear', name: 'New Year', particle: '🎉', from: [12, 31], to: [1, 2] },
  { key: 'valentines', name: "Valentine's Day", particle: '💖', from: [2, 12], to: [2, 14] },
  { key: 'halloween', name: 'Halloween', particle: '🎃', from: [10, 25], to: [10, 31] },
]

const inRange = (month, day, from, to) => {
  const val = month * 100 + day
  const fromVal = from[0] * 100 + from[1]
  const toVal = to[0] * 100 + to[1]
  if (fromVal <= toVal) return val >= fromVal && val <= toVal
  // Wraps across year boundary (e.g. Dec 31 -> Jan 2)
  return val >= fromVal || val <= toVal
}

export const getActiveHoliday = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  return HOLIDAYS.find(h => inRange(month, day, h.from, h.to)) || null
}

const STORAGE_KEY = 'teenz_holiday_theme_enabled'

export const isHolidayThemeEnabled = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export const setHolidayThemeEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}
