ALTER TABLE public.guests
ALTER COLUMN last_name
DROP NOT NULL;

ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS country varchar(20);