USE [VocabMasterDB];
GO

/* Activate SQL Server mode */
UPDATE dbo.StorageMode
SET IsActive = CASE WHEN ModeName = N'SQLServer' THEN 1 ELSE 0 END,
    UpdatedAt = SYSDATETIME();
GO

/* Activate File mode */
/*
UPDATE dbo.StorageMode
SET IsActive = CASE WHEN ModeName = N'File' THEN 1 ELSE 0 END,
    UpdatedAt = SYSDATETIME();
GO
*/

/* Read current mode */
SELECT ModeName, IsActive, UpdatedAt
FROM dbo.StorageMode
ORDER BY ModeId;
GO

/* Quick health check counts */
SELECT 'Vocabulary' AS TableName, COUNT(*) AS TotalRows FROM dbo.Vocabulary
UNION ALL
SELECT 'Passage', COUNT(*) FROM dbo.Passage
UNION ALL
SELECT 'Grammar', COUNT(*) FROM dbo.Grammar
UNION ALL
SELECT 'CurriculumCourse', COUNT(*) FROM dbo.CurriculumCourse
UNION ALL
SELECT 'CurriculumDay', COUNT(*) FROM dbo.CurriculumDay;
GO

/* Example upsert for app metadata */
MERGE dbo.AppMeta AS target
USING (SELECT N'LastSyncAt' AS MetaKey, CONVERT(NVARCHAR(30), SYSDATETIME(), 126) AS MetaValue) AS source
ON target.MetaKey = source.MetaKey
WHEN MATCHED THEN
  UPDATE SET target.MetaValue = source.MetaValue, target.UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED THEN
  INSERT (MetaKey, MetaValue) VALUES (source.MetaKey, source.MetaValue);
GO

/* Check full app snapshot saved by Tauri sync_full_app_data_to_sql */
SELECT
  MetaKey,
  LEN(MetaValue) AS JsonLength,
  UpdatedAt,
  LEFT(MetaValue, 300) AS JsonPreview
FROM dbo.AppMeta
WHERE MetaKey = N'FullAppDataJson';
GO
