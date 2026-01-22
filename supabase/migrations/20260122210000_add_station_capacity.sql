-- Add capacity column to airports
ALTER TABLE airports
ADD COLUMN total_spots integer DEFAULT NULL
CONSTRAINT check_total_spots_non_negative CHECK (total_spots IS NULL OR total_spots >= 0);
