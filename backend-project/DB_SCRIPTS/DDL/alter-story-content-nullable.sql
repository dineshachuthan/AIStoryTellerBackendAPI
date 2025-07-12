-- Make story content column nullable
ALTER TABLE stories ALTER COLUMN content DROP NOT NULL;