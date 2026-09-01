# UDH · Sistema de Escuelas de Formación (Bogati)

Sistema interno del departamento **UDH (Universidad del Helado)** de Bogati para
registrar y dar seguimiento a las escuelas de formación (PDV) a nivel nacional:
procesos operativos, seguimientos de reclutamiento/capacitación, y recompensas
o material entregado a cada escuela.

Reemplaza el archivo `ESCUELAS DE FORMACION 2026.xlsx` que se usaba hasta ahora.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: Postgres, Auth y Row Level Security (RLS)
- Pensado para desplegarse en **Vercel**, conectado a este repositorio de GitHub

## Roles

- **Admin UDH**: acceso total (crear/editar/eliminar escuelas, gestionar usuarios,
  ver y editar datos bancarios de colaboradores).
- **Analista**: registra seguimientos, entregas y actualiza el estado de las
  escuelas. No ve los datos bancarios de colaboradores (aparecen enmascarados)
  ni puede eliminar registros.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden:
   - `supabase/migrations/0001_schema.sql` (tablas, roles, RLS)
   - `supabase/seed/0002_seed.sql` (datos migrados desde el Excel: escuelas,
     colaboradores, entregas y seguimientos)
3. En **Authentication → Users**, crea el primer usuario (tu correo y contraseña).
   Al crearse, el trigger `handle_new_user` le genera automáticamente un perfil
   con rol `analista`.
4. En **SQL Editor**, promuévelo a administrador:
   ```sql
   update public.profiles set role = 'admin_udh'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```
5. Copia la **URL del proyecto** y la **anon key** (Settings → API).

### 2. Configurar el proyecto localmente

```bash
cp .env.example .env.local
# Pega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con el
usuario admin creado en Supabase.

### 3. Desplegar en Vercel

1. Sube este repositorio a GitHub (ver abajo).
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Define las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el proyecto de Vercel.
4. Despliega. Cada `git push` a la rama principal vuelve a desplegar
   automáticamente.

## Notas sobre la migración de datos

`supabase/seed/0002_seed.sql` se generó automáticamente a partir de
`ESCUELAS DE FORMACION 2026.xlsx` (hojas `ESCUELAS`, `ESCUELAS JULIO 26` y
`SEGUIMIENTO`). Se usó **ESCUELAS JULIO 26** como estado vigente de cada
escuela (28 escuelas) y se añadieron 5 escuelas que solo existían en la hoja
`ESCUELAS` original. Puntos a revisar manualmente después de la migración:

- **LRIO QUEVEDO AV. 7 DE OCTUBRE** y **QUEVEDO 7 DE OCTUBRE** parecen ser la
  misma escuela renombrada; quedaron como dos registros porque el nombre
  cambió de forma no trivial entre hojas. Revisar y desactivar/fusionar el
  que corresponda desde la ficha de la escuela.
- **PAST PUYO EL OBRERO** vs **PAST PUYO FORMADORES (Obrero / Principal)**:
  no fue posible determinar automáticamente si son la misma escuela renombrada
  o escuelas distintas. Revisar con el equipo de zona.
- Los colaboradores con rol **ADMIN/POLI** se infirieron por orden y, cuando
  fue posible, cruzando el nombre contra el texto de la cuenta bancaria. En
  escuelas donde la hoja original no tenía nombres de miembros (solo la nota
  "VISITAR REFUERZO"), el nombre se extrajo del propio texto de la cuenta.
  Conviene revisar la lista de colaboradores de cada escuela una vez en el
  sistema.
- Los seguimientos (`SEGUIMIENTO`) se vincularon a su escuela por coincidencia
  de nombre; si alguno no encontró una escuela exacta, quedó guardado en el
  campo `escuela_nombre_libre` visible en la base de datos aunque no aparezca
  asociado a ninguna escuela en la lista.

## Estructura del proyecto

```
src/app/(app)/         Páginas protegidas (requieren sesión)
  escuelas/             Listado, ficha, colaboradores y entregas por escuela
  seguimientos/         Reclutamiento y capacitación
  entregas/             Vista nacional de recompensas y material entregado
  usuarios/             Gestión de roles (solo Admin UDH)
src/app/login/          Autenticación
src/lib/supabase/       Clientes de Supabase (browser, server, middleware)
supabase/migrations/    Esquema SQL + RLS
supabase/seed/          Datos iniciales migrados desde el Excel
```
