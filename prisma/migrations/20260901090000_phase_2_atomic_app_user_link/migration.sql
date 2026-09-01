-- Better Auth's after-hooks run after its transaction commits. Carry the
-- requested locale through the auth-user INSERT, create app_user in the same
-- PostgreSQL statement, then clear the transport column immediately.
ALTER TABLE "user" ADD COLUMN "signup_locale" TEXT;

ALTER TABLE "user"
  ADD CONSTRAINT "user_signup_locale_check"
  CHECK ("signup_locale" IS NULL OR "signup_locale" IN ('ka', 'en'));

-- Backfill any pre-trigger Better Auth users before enforcing the identity
-- relationship. A duplicate product email deliberately makes this migration
-- fail instead of preserving an ambiguous identity.
INSERT INTO "app_user" ("id", "email", "locale", "created_at")
SELECT u."id", u."email", 'ka', u."created_at"
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM "app_user" au WHERE au."id" = u."id"
);

ALTER TABLE "app_user"
  ADD CONSTRAINT "app_user_id_fkey"
  FOREIGN KEY ("id") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "create_app_user_for_auth_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "app_user" ("id", "email", "locale", "created_at")
  VALUES (
    NEW."id",
    NEW."email",
    COALESCE(NEW."signup_locale", 'ka'),
    NEW."created_at"
  );

  UPDATE "user"
  SET "signup_locale" = NULL
  WHERE "id" = NEW."id";

  RETURN NEW;
END;
$$;

CREATE TRIGGER "user_create_app_user"
AFTER INSERT ON "user"
FOR EACH ROW
EXECUTE FUNCTION "create_app_user_for_auth_user"();
