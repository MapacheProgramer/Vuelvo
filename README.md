# Vuelvo

Aplicación de fidelización con React + Vite y Supabase.

## Rutas actuales

- `/t/:code` — escaneo del QR, registro/identificación y registro de visita.
- `/card/:code` — consulta de la tarjeta sin sumar una visita.

## Estructura frontend

```text
src/
├── app/                         # Router y composición de la aplicación
├── components/
│   ├── layout/                  # Cabeceras y futuros layouts
│   ├── loyalty/                 # Componentes del programa de fidelización
│   └── ui/                      # Primitivas visuales reutilizables
├── features/
│   └── loyalty/
│       ├── api/                 # Llamadas específicas del dominio
│       └── storage/             # Persistencia local del dominio
├── hooks/                       # Hooks/utilidades ligadas a React/browser
├── pages/
│   └── public/                  # Páginas públicas del cliente
├── services/                    # Infraestructura compartida (Edge Functions, etc.)
└── styles/                      # Design system global y layouts base
```

## Sistema visual

Los tokens se centralizan en `src/styles/tokens.css`.

Paleta principal:

- Orange `#d25a24` — bordes y acentos.
- Green `#113722` — acciones principales.
- Crimson `#6b1229` — sombra rígida tipo sticker.
- Neutrales — `#000000`, `#232323`, `#646464`, `#808080`, `#cccccc`, `#d7d7d7`, `#efefef`, `#ffffff`.

Regla de estilos:

- `styles/`: tokens, reset, tipografía y layouts globales.
- CSS específico: junto al componente que lo usa.
- No duplicar colores/espaciados: usar variables de `tokens.css`.

## Desarrollo

1. Crear/restaurar `.env` con las variables existentes del proyecto.
2. Instalar dependencias:

```bash
npm install
```

3. Iniciar Vite:

```bash
npm run dev
```

4. Probar al menos:

```text
http://localhost:5173/t/MG001
http://localhost:5173/card/MG001
```

## Supabase

Las Edge Functions actuales están en:

```text
supabase/functions/visit/
supabase/functions/card-status/
```

`card-status` está configurada con `verify_jwt = false` porque el flujo público actual identifica al cliente mediante `device_token` y aplica su propia validación/CORS.

## Próximas áreas

La estructura ya está preparada para incorporar posteriormente:

- `pages/auth/`
- `pages/dashboard/`
- `pages/admin/`
- `features/auth/`
- `features/customers/`
- `features/rewards/`
- `features/businesses/`

sin mezclar esas responsabilidades con el flujo público del cliente.
