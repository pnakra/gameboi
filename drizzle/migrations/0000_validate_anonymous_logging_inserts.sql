DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert well-formed analytics events" ON public.analytics_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(session_id) BETWEEN 1 AND 100
  AND char_length(event_name) BETWEEN 1 AND 80
  AND event_name ~ '^[a-z0-9_]+$'
  AND jsonb_typeof(properties) = 'object'
  AND pg_column_size(properties) <= 16384
);

DROP POLICY IF EXISTS "Anyone can insert exchange logs" ON public.exchange_logs;
CREATE POLICY "Anyone can insert well-formed exchange logs" ON public.exchange_logs
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(session_id) BETWEEN 1 AND 100
  AND exchange_number BETWEEN 0 AND 20
  AND coalesce(char_length(friend_id), 0) <= 50
  AND coalesce(char_length(friend_name), 0) <= 50
  AND coalesce(char_length(phase), 0) <= 50
  AND coalesce(char_length(reply_source), 0) <= 20
  AND coalesce(char_length(chosen_reply), 0) <= 2000
  AND coalesce(char_length(raw_response), 0) <= 20000
  AND jsonb_typeof(friend_messages) = 'array'
  AND jsonb_typeof(cards) = 'array'
  AND pg_column_size(friend_messages) <= 16384
  AND pg_column_size(cards) <= 16384
);