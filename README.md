# 🤝 Mapa de Ayuda — Miranda · Distrito Capital · La Guaira

Mapa interactivo y colaborativo para **coordinar la ayuda humanitaria** tras un
desastre en los estados **Miranda**, **Distrito Capital** y **La Guaira (Vargas)**,
Venezuela.

El objetivo es responder, de un vistazo y por zona, a tres preguntas:

- **¿Quién está ayudando y dónde?** (equipos de rescate, edificaciones en búsqueda)
- **¿Cuál es el estado actual?** (gravedad, personas atendidas en hospitales)
- **¿Qué se necesita y a dónde enviarlo?** (suministros, sangre y punto de entrega/contacto)

## Personas

| Persona | Qué puede hacer |
|---|---|
| **Lector** (cualquiera, sin credenciales) | Ver el mapa, abrir cada parroquia/hospital, leer su estado y **enviar reportes** de actualización. |
| **Administrador** | Iniciar sesión, **revisar los reportes** enviados por el público y **publicarlos** (o rechazarlos), además de editar cada ubicación directamente. |

Cada reporte enviado por el público entra como **pendiente** y **no se publica**
hasta que un administrador lo aprueba.

## Tipos de punto

- **Parroquias** (polígonos sombreados): equipos de rescate, edificaciones donde se
  busca personas, suministros necesarios y punto de entrega de donaciones.
- **Hospitales** (marcadores): personas atendidas por el desastre, necesidad de
  **donación de sangre**, suministros necesarios y punto de entrega de donaciones.

El color del polígono/marcador indica el **nivel de gravedad**
(Crítico · Alto · Medio · Estable · Sin datos).

---

## 🚀 Modo DEMO (sin backend, para probar ya)

No requiere cuenta ni configuración. Los datos se guardan en el navegador.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Para entrar como administrador usa el botón **Admin**
con la clave **`admin123`** (solo demo).

> En modo demo cada navegador tiene sus propios datos. Es solo para previsualizar
> el flujo completo; **no** comparte información entre usuarios.

---

## 🗄️ Modo producción (Supabase)

### 1. Crear el proyecto
1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **Project Settings → API** copia la **Project URL** y la **anon public key**.

### 2. Crear el esquema y los datos
En el panel de Supabase, abre **SQL Editor** y ejecuta, en este orden:

1. `supabase/schema.sql` — tablas, seguridad (RLS) y permisos.
2. `supabase/seed.sql` — precarga las **302 ubicaciones** (102 parroquias + 200 hospitales).

> Si actualizas el catálogo de ubicaciones, regenera el seed con `npm run gen:seed`.

### 3. Crear administradores
1. **Authentication → Users → Add user**: crea el usuario (correo + contraseña) de cada admin.
2. Copia su **User UID** y regístralo como administrador en el **SQL Editor**:

```sql
insert into public.admins (user_id, email)
values ('PEGA-AQUI-EL-USER-UID', 'admin@ejemplo.com');
```

### 4. Conectar la app
Copia `.env.example` a `.env` y complétalo:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Reinicia `npm run dev`. El badge "MODO DEMO" desaparece cuando hay backend conectado.

---

## ☁️ Despliegue (sitio estático)

Compatible con **Netlify**, **Vercel**, **Cloudflare Pages**, GitHub Pages, etc.

```bash
npm run build      # genera /dist
```

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 🧱 Estructura

```
mapa-ayuda/
├─ index.html
├─ public/
│  ├─ parroquias.geojson      # polígonos de parroquias (simplificados, ~210 KB)
│  └─ favicon.svg
├─ src/
│  ├─ App.jsx                 # orquestador + filtros
│  ├─ components/
│  │  ├─ MapView.jsx          # mapa Leaflet (polígonos + marcadores)
│  │  ├─ LocationPanel.jsx    # ficha + edición de admin
│  │  ├─ SubmissionForm.jsx   # formulario público de reportes
│  │  ├─ AdminLogin.jsx       # acceso de administrador
│  │  ├─ AdminQueue.jsx       # cola de revisión de reportes
│  │  ├─ Header.jsx · Legend.jsx
│  ├─ lib/
│  │  ├─ supabaseClient.js    # cliente + detección de modo demo
│  │  └─ repository.js        # capa de datos (Supabase ⇄ demo localStorage)
│  └─ data/
│     ├─ parroquias.geojson   # original sin simplificar (fuente)
│     ├─ parroquias_points.json
│     ├─ hospitales.json
│     └─ constants.js
├─ supabase/
│  ├─ schema.sql              # tablas + RLS + permisos
│  └─ seed.sql                # 302 ubicaciones (generado)
└─ scripts/
   ├─ gen-seed.mjs            # regenera seed.sql
   └─ gen-geojson (npm run gen:geojson)
```

## 🗺️ Datos geográficos

- **Parroquias** (límites administrativos) y **hospitales**: © OpenStreetMap
  (Overpass API). Los polígonos se simplifican con `mapshaper` (`npm run gen:geojson`)
  para que el mapa cargue rápido.
- Para actualizar el catálogo: edita los `*.json` / `*.geojson` en `src/data/`,
  luego ejecuta `npm run gen:geojson` y `npm run gen:seed`.

## 🔒 Modelo de seguridad

- **Lectura pública** de ubicaciones (cualquiera, sin sesión).
- **Inserción pública** de reportes, que siempre entran como `pending`.
- **Lectura/edición** de reportes y **modificación** de ubicaciones: solo
  usuarios presentes en la tabla `admins` (verificado vía Row Level Security).

## 📜 Licencia de datos

Datos de OpenStreetMap bajo **ODbL**. Recuerda mantener la atribución a
OpenStreetMap (ya incluida en el mapa).
