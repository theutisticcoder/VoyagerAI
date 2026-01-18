
import { SessionState } from './types';
import { APP_STORAGE_KEY } from './constants';
import { supabase } from './supabaseClient';

export const saveSession = async (session: SessionState, userId?: string) => {
  // Always save locally for offline support
  const localSessions = getLocalSessions();
  const index = localSessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    localSessions[index] = session;
  } else {
    localSessions.push(session);
  }
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(localSessions));

  // If user is logged in, sync to Supabase
  if (userId) {
    try {
      const { error } = await supabase
        .from('sessions')
        .upsert({ 
          id: session.id,
          user_id: userId,
          data: session,
          updated_at: new Date().toISOString()
        });
      if (error) console.error("Supabase Sync Error:", error);
    } catch (e) {
      console.error("Supabase Persistence Failure:", e);
    }
  }
};

export const getLocalSessions = (): SessionState[] => {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const getRemoteSessions = async (userId: string): Promise<SessionState[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  if (error) return [];
  return data.map(item => item.data as SessionState);
};

export const deleteSession = async (id: string, userId?: string) => {
  const sessions = getLocalSessions().filter(s => s.id !== id);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(sessions));

  if (userId) {
    await supabase.from('sessions').delete().eq('id', id).eq('user_id', userId);
  }
};
