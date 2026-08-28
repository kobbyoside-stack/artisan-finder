import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rgzrchaisuvkeciyjfzi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnenJjaGFpc3V2a2VjaXlqZnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTY2NjAsImV4cCI6MjEwMzQzMjY2MH0.ZQ1-mRPkEp5pUXzhxIHV-zKIN-pVjhuvWNPm-BzDPwo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);