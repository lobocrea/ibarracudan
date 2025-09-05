// Utiliza `NEXT_PUBLIC_` para que estas variables estén disponibles en el cliente.
// Rellena estos valores con las credenciales de tu proyecto de Supabase.
// Puedes encontrarlas en "Project Settings" > "API" en tu dashboard de Supabase.

export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "URL_DE_TU_PROYECTO_SUPABASE";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "TU_SUPABASE_ANON_KEY";

if (NEXT_PUBLIC_SUPABASE_URL === "URL_DE_TU_PROYECTO_SUPABASE" || NEXT_PUBLIC_SUPABASE_ANON_KEY === "TU_SUPABASE_ANON_KEY") {
  console.warn(
    "Supabase URL or Anon Key are not set. Please create a .env.local file in the root of your project with the following content:\n\n" +
    "NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL\n" +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY\n"
  );
}
