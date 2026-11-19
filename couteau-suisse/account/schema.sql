CREATE TABLE IF NOT EXISTS cs_private_addresses (
  owner TEXT NOT NULL, id TEXT NOT NULL, envelope TEXT NOT NULL,
  PRIMARY KEY(owner,id)
);
CREATE TABLE IF NOT EXISTS cs_daily_visits (
  day TEXT NOT NULL, owner TEXT NOT NULL, PRIMARY KEY(day,owner)
);
CREATE TABLE IF NOT EXISTS cs_preferences (
 owner TEXT NOT NULL, name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,name)
);
