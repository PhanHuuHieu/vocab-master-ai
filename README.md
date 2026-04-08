# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Dual Storage Mode (File / SQL Server)

Current app behavior:

- Default mode is File/Browser storage (IndexedDB + JSON export/import)
- SQL Server schema scripts are prepared for backend integration

SQL scripts:

- [database/sqlserver/01_create_database_and_schema.sql](database/sqlserver/01_create_database_and_schema.sql)
- [database/sqlserver/02_sample_queries_and_mode_switch.sql](database/sqlserver/02_sample_queries_and_mode_switch.sql)
- [database/sqlserver/README.md](database/sqlserver/README.md)

Quick run:

```powershell
sqlcmd -S localhost -U sa -P 123456 -i database/sqlserver/01_create_database_and_schema.sql
sqlcmd -S localhost -U sa -P 123456 -i database/sqlserver/02_sample_queries_and_mode_switch.sql
```

After running these scripts, database VocabMasterDB and all required tables are created.
