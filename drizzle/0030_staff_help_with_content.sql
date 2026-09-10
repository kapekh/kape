-- Staff help admins add content, so the built-in role carries the editor's areas.
-- Only the untouched default is moved; a role an administrator has already edited is left alone.
UPDATE roles
SET permissions = '["portal","pages","posts","projects","media"]',
    updated_at = datetime('now')
WHERE key = 'staff' AND permissions = '["portal"]';
