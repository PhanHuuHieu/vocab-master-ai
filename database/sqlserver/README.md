# SQL Server mode setup

This folder contains SQL scripts to create and manage a local SQL Server database for VocabMaster.

## Connection target

- Server: localhost
- Login: sa
- Password: 123456

## Run order

1. Run [01_create_database_and_schema.sql](01_create_database_and_schema.sql)
2. Run [02_sample_queries_and_mode_switch.sql](02_sample_queries_and_mode_switch.sql)

## Example with sqlcmd

```powershell
sqlcmd -S localhost -U sa -P 123456 -i database/sqlserver/01_create_database_and_schema.sql
sqlcmd -S localhost -U sa -P 123456 -i database/sqlserver/02_sample_queries_and_mode_switch.sql
```

## Data model summary

- Vocabulary and related detail tables:
  - VocabularyExample
  - VocabularyAntonym
  - VocabularyCollocation
- Reading passages:
  - Passage
  - PassageMedia
  - PassageWord
  - PassageWordExample
  - PassageQuestion
- Grammar:
  - Grammar
- Curriculum:
  - CurriculumCourse
  - CurriculumDay
  - CurriculumDayVocabulary
  - CurriculumDayPassage
  - CurriculumDayGrammar
- App-level support:
  - StorageMode
  - AppMeta

## Notes

- IDs use BIGINT because app objects currently use timestamp-style IDs.
- StorageMode supports dual mode: File and SQLServer.
- Current frontend still stores in browser/file mode by default.
- SQL scripts are ready for backend integration (Tauri command or local API) as the next step.
