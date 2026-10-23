-- Чистка осиротевших таблиц после выпуска «Златопрядов» (docs/zlatopryady/RELEASE.md, раздел 7).
--
-- ТОЛЬКО ПОСЛЕ БЭКАПА: сначала ветка базы в Neon (RELEASE.md, раздел 1).
-- Удалённое не вернуть. Все строки закомментированы: раскомментируйте то,
-- что действительно хотите удалить, и выполните в Neon → SQL Editor.
-- Код ветки zlatopryady ни одну из этих таблиц не читает и не пишет.

-- BEGIN;

-- ── Личные данные из бывшего «Batyr's Hub» (главная причина чистки) ──
-- DROP TABLE IF EXISTS connections CASCADE;
-- DROP TABLE IF EXISTS people CASCADE;

-- ── Удалённые разделы сайта ──
-- DROP TABLE IF EXISTS about_profile_skills CASCADE;
-- DROP TABLE IF EXISTS about_profile CASCADE;
-- DROP TABLE IF EXISTS media_links CASCADE;
-- DROP TABLE IF EXISTS media_profile CASCADE;
-- DROP TABLE IF EXISTS portfolio_project_tags CASCADE;
-- DROP TABLE IF EXISTS portfolio_projects CASCADE;
-- DROP TABLE IF EXISTS download_links CASCADE;
-- DROP TABLE IF EXISTS minecraft_server CASCADE;
-- DROP TABLE IF EXISTS poll_votes CASCADE;
-- DROP TABLE IF EXISTS poll_options CASCADE;
-- DROP TABLE IF EXISTS polls CASCADE;

-- ── Старая магия (до «Магии v2») ──
-- DROP TABLE IF EXISTS spell_hint_grants CASCADE;
-- DROP TABLE IF EXISTS research_drafts CASCADE;
-- DROP TABLE IF EXISTS aspect_recipes CASCADE;
-- ALTER TABLE known_spells DROP COLUMN IF EXISTS accuracy_percentage;

-- ── Старые разделы ролей (роли теперь только OWNER и MEMBER) ──
-- DROP TABLE IF EXISTS role_sections CASCADE;
-- Свои роли, кроме OWNER и MEMBER, ничего больше не дают. Посмотреть их:
-- SELECT id, key, label FROM roles WHERE key NOT IN ('OWNER', 'MEMBER');

-- COMMIT;
