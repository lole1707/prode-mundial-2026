import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Crear usuario admin
const { data, error } = await supabase.auth.admin.createUser({
  email: "admin@prode.app",
  password: "108915",
  email_confirm: true,
});

if (error) {
  console.log("Error (puede que ya exista):", error.message);
} else {
  console.log("Admin creado. UID:", data.user.id);

  // Crear perfil en tabla users
  await supabase.from("users").upsert({
    uid: data.user.id,
    display_name: "Admin",
    total_points: 0,
  });

  console.log("ADMIN_UID=" + data.user.id);
}
