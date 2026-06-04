-- 删除 EULER 脏数据 SQL
-- 执行前请备份,或先运行 SELECT 确认影响范围

-- 方式一:精确删除 partnerhub.anthropic.com 来的 EULER 卡
-- (推荐,最保守)
DELETE FROM Hotspot
WHERE url LIKE '%partnerhub.anthropic.com%'
  AND title LIKE '%EULER%';

-- 方式二(可选):删除所有匹配新过滤器规则的历史非新闻页
-- (更彻底,但影响范围更大——先用 SELECT 预览再决定是否执行)
--
-- 预览哪些会被删:
-- SELECT id, title, url, source, createdAt
-- FROM Hotspot
-- WHERE (
--   url LIKE '%/signin%' OR url LIKE '%/login%' OR url LIKE '%/signup%'
--   OR url LIKE '%/dashboard%' OR url LIKE '%/console%' OR url LIKE '%/portal%'
--   OR url LIKE '%partnerhub.%' OR url LIKE '%hub.%' OR url LIKE '%app.%'
--   OR title LIKE '%Welcome to%' OR title LIKE '%欢迎%'
--   OR title LIKE '%Sign in%' OR title LIKE '%Log in%' OR title LIKE '%登录%'
-- )
-- ORDER BY createdAt DESC
-- LIMIT 50;
--
-- 确认无误后执行删除:
-- DELETE FROM Hotspot WHERE id IN (
--   SELECT id FROM Hotspot
--   WHERE (
--     url LIKE '%/signin%' OR url LIKE '%/login%' OR url LIKE '%/signup%'
--     OR url LIKE '%/dashboard%' OR url LIKE '%/console%' OR url LIKE '%/portal%'
--     OR url LIKE '%partnerhub.%' OR url LIKE '%hub.%' OR url LIKE '%app.%'
--     OR title LIKE '%Welcome to%' OR title LIKE '%欢迎%'
--     OR title LIKE '%Sign in%' OR title LIKE '%Log in%' OR title LIKE '%登录%'
--   )
-- );

-- 方式三:如果你已知 EULER 卡的 id(从截图或前端拷贝),可以直接:
-- DELETE FROM Hotspot WHERE id = 'xxx-xxx-xxx-xxx';
