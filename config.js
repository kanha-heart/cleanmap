// ---------------------------------------------------------------
// CleanMap configuration
//
// Leave both values empty  -> DEMO MODE (data stays in this browser only).
// Fill both values in      -> LIVE MODE (shared Supabase database + photo storage).
//
// Find them in Supabase: Project Settings -> API (or "API Keys")
//   Project URL   e.g. https://abcdxyz.supabase.co
//   anon key  (may be labelled "anon public" or "Publishable key" - either works)
// NEVER paste the "service_role" or "secret" key here.
// Keep the quote marks "" around each value.
// ---------------------------------------------------------------
window.CLEANMAP_CONFIG = {
  SUPABASE_URL: "https://wrlxaqsyglxlwgelectm.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_T91r1Y53OKwf1iY-40Cy2Q_KHoTbh_U",
  PHOTO_BUCKET: "photos",
  DEFAULT_CENTER: [20.5937, 78.9629], // used until GPS / data is available
  DEFAULT_ZOOM: 5
};
