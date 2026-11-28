-- ── 이벤트 오버부킹 방지 트리거 ──────────────────────────────────────────────
-- 동시 신청 race condition 대응: INSERT 전 max_participants 체크를 DB 레벨에서 수행.
-- FOR UPDATE 락을 걸어 두 요청이 동시에 체크를 통과하는 경우를 방지.

CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max   INTEGER;
  v_count INTEGER;
BEGIN
  -- 행 단위 락: 동일 이벤트 동시 INSERT 직렬화
  SELECT max_participants, participants_count
    INTO v_max, v_count
    FROM events
   WHERE id = NEW.event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'EVENT_FULL: max_participants(%) reached', v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_event_capacity ON event_participants;
CREATE TRIGGER trg_check_event_capacity
  BEFORE INSERT ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_event_capacity();
