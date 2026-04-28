-- Anonymous analytics for gameboi
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous) can insert events. No reads from the client.
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Exchange-level logs (friend message + player reply per turn)
CREATE TABLE public.exchange_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  friend_id TEXT,
  friend_name TEXT,
  exchange_number INTEGER NOT NULL,
  phase TEXT,
  chosen_reply TEXT,
  reply_source TEXT, -- 'card' | 'freetext' | null (opener)
  friend_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_final BOOLEAN NOT NULL DEFAULT false,
  raw_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_exchange_logs_session ON public.exchange_logs(session_id);
CREATE INDEX idx_exchange_logs_created ON public.exchange_logs(created_at DESC);

ALTER TABLE public.exchange_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert exchange logs"
ON public.exchange_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
