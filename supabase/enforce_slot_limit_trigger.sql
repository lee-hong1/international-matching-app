-- Atomic enforcement of per-host slot and service limits via DB triggers.
-- Replaces the TOCTOU count-then-insert patterns in the availability and services APIs.

CREATE OR REPLACE FUNCTION enforce_availability_slot_limit()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slot_count INT;
BEGIN
  SELECT COUNT(*) INTO slot_count
    FROM host_availability
   WHERE host_id = NEW.host_id
     AND is_active = TRUE;

  IF slot_count >= 20 THEN
    RAISE EXCEPTION 'SLOT_LIMIT_EXCEEDED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_availability_slot_limit ON host_availability;
CREATE TRIGGER trg_enforce_availability_slot_limit
  BEFORE INSERT ON host_availability
  FOR EACH ROW EXECUTE FUNCTION enforce_availability_slot_limit();

-- ── 서비스 수 제한: 호스트당 최대 50개 ───────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_service_limit()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  svc_count INT;
BEGIN
  SELECT COUNT(*) INTO svc_count
    FROM services
   WHERE host_id = NEW.host_id
     AND is_active = TRUE;

  IF svc_count >= 50 THEN
    RAISE EXCEPTION 'SERVICE_LIMIT_EXCEEDED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_limit ON services;
CREATE TRIGGER trg_enforce_service_limit
  BEFORE INSERT ON services
  FOR EACH ROW EXECUTE FUNCTION enforce_service_limit();

-- ── 쇼핑 링크 제한: 호스트당 최대 20개 활성 링크 ─────────────────────────────

CREATE OR REPLACE FUNCTION enforce_shop_link_limit()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  link_count INT;
BEGIN
  SELECT COUNT(*) INTO link_count
    FROM host_shop_links
   WHERE host_id = NEW.host_id
     AND status = 'active';

  IF link_count >= 20 THEN
    RAISE EXCEPTION 'SHOP_LINK_LIMIT_EXCEEDED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_shop_link_limit ON host_shop_links;
CREATE TRIGGER trg_enforce_shop_link_limit
  BEFORE INSERT ON host_shop_links
  FOR EACH ROW EXECUTE FUNCTION enforce_shop_link_limit();
