export const ROTATE_REFRESH_TOKEN_LUA = `
local current = redis.call("GET", KEYS[1])
local previous = redis.call("GET", KEYS[2])
local absoluteExpiresAt = redis.call("HGET", KEYS[3], "absoluteExpiresAt")

if not absoluteExpiresAt then
  return { "INVALID" }
end

local now = tonumber(ARGV[4])
local refreshTtl = tonumber(ARGV[3])
absoluteExpiresAt = tonumber(absoluteExpiresAt)

if now >= absoluteExpiresAt then
  redis.call("DEL", KEYS[1])
  redis.call("DEL", KEYS[2])
  redis.call("DEL", KEYS[3])
  return { "ABSOLUTE_EXPIRED" }
end

local remainingAbsoluteTtl = absoluteExpiresAt - now
local finalTtl = refreshTtl

if remainingAbsoluteTtl < refreshTtl then
  finalTtl = remainingAbsoluteTtl
end

local graceTtl = tonumber(ARGV[5])

if current and current == ARGV[1] then
  redis.call("SET", KEYS[2], ARGV[1], "EX", finalTtl)
  redis.call("SET", KEYS[1], ARGV[2], "EX", finalTtl)
  redis.call("HSET", KEYS[3], "updatedAt", ARGV[4])
  redis.call("EXPIRE", KEYS[3], remainingAbsoluteTtl + graceTtl)
  return { "OK", tostring(finalTtl) }
end

if previous and previous == ARGV[1] then
  redis.call("DEL", KEYS[1])
  redis.call("DEL", KEYS[2])
  redis.call("DEL", KEYS[3])
  return { "REUSED" }
end

return { "INVALID" }
`;
