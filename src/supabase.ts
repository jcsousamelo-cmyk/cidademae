import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iozopoabiqwrefkwvcml.supabase.co";
const supabaseKey = "sb_publishable_gsD2Ucnno_zzXiZ50NvLSg_8f9EGmJh";

export const supabase = createClient(supabaseUrl, supabaseKey);