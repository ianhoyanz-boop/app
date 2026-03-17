import { UserPreferences, Event, Reminder } from '../types';

const KEYS = {
  preferences: 'wb_preferences',
  trackedEvents: 'wb_tracked_events',
  reminders: 'wb_reminders',
  dismissedEvents: 'wb_dismissed',
};

const defaultPreferences: UserPreferences = {
  categories: [],
  city: '上海',
  budget: 'any',
  preferredDays: ['saturday', 'sunday'],
  favoriteArtists: [],
  interests: [],
};

export function getPreferences(): UserPreferences {
  const stored = localStorage.getItem(KEYS.preferences);
  return stored ? JSON.parse(stored) : defaultPreferences;
}

export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(KEYS.preferences, JSON.stringify(prefs));
}

export function getTrackedEvents(): Event[] {
  const stored = localStorage.getItem(KEYS.trackedEvents);
  return stored ? JSON.parse(stored) : [];
}

export function trackEvent(event: Event): void {
  const events = getTrackedEvents();
  if (!events.find(e => e.id === event.id)) {
    events.push(event);
    localStorage.setItem(KEYS.trackedEvents, JSON.stringify(events));
  }
}

export function untrackEvent(eventId: string): void {
  const events = getTrackedEvents().filter(e => e.id !== eventId);
  localStorage.setItem(KEYS.trackedEvents, JSON.stringify(events));
}

export function getReminders(): Reminder[] {
  const stored = localStorage.getItem(KEYS.reminders);
  return stored ? JSON.parse(stored) : [];
}

export function addReminder(reminder: Reminder): void {
  const reminders = getReminders();
  reminders.push(reminder);
  localStorage.setItem(KEYS.reminders, JSON.stringify(reminders));
}

export function removeReminder(eventId: string): void {
  const reminders = getReminders().filter(r => r.eventId !== eventId);
  localStorage.setItem(KEYS.reminders, JSON.stringify(reminders));
}

export function getDismissedEvents(): string[] {
  const stored = localStorage.getItem(KEYS.dismissedEvents);
  return stored ? JSON.parse(stored) : [];
}

export function dismissEvent(eventId: string): void {
  const dismissed = getDismissedEvents();
  dismissed.push(eventId);
  localStorage.setItem(KEYS.dismissedEvents, JSON.stringify(dismissed));
}
