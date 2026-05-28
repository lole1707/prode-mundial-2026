import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bpypdfgqjfynxwrocori.supabase.co",
  "sb_publishable_5RRN1AWpWRb3VYSvPkxpsQ_UL0IcehD"
);

console.log("Probando login con admin@prode.app / 108915...");
const { data, error } = await supabase.auth.signInWithPassword({
  email: "admin@prode.app",
  password: "108915",
});

if (error) {
  console.log("ERROR:", error.message, "| Status:", error.status, "| Code:", error.code);
} else {
  console.log("LOGIN OK. UID:", data.user.id);
}
