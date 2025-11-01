-- Enable Realtime for sales_records and attendance_records tables
-- This allows the dashboard to receive real-time updates when new records are inserted

-- Enable Realtime for sales_records
ALTER PUBLICATION supabase_realtime ADD TABLE sales_records;

-- Enable Realtime for attendance_records
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Verify: List all tables with Realtime enabled
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
