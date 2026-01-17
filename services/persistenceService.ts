
import { SessionState, StoryChapter } from '../types';
import { APP_STORAGE_KEY } from '../constants';

export const saveSession = (session: SessionState) => {
  const existingSessions = getSessions();
  const index = existingSessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    existingSessions[index] = session;
  } else {
    existingSessions.push(session);
  }
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(existingSessions));
};

export const getSessions = (): SessionState[] => {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const deleteSession = (id: string) => {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(sessions));
};
