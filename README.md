# Property Pal

Застосунок для керування орендною нерухомістю на `React + Vite + Tailwind`, з backend на `Cloudflare Workers` і базою `D1`.

## Запуск

1. `npm install`
2. Застосуй схему до D1 з [`worker/schema.sql`](./worker/schema.sql)
3. Запусти API: `npm run dev:api`
4. Запусти frontend: `npm run dev`

## Основні модулі

- `Properties`
- `Tenants`
- `Payments`
- `Meters`
- `Tasks`
- `Dashboard`

## Перевірка

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run worker:check`
