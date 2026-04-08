/*
  VocabMaster SQL Server schema
  Target: SQL Server localhost (login: sa)
*/

USE [master];
GO

IF DB_ID(N'VocabMasterDB') IS NULL
BEGIN
  CREATE DATABASE [VocabMasterDB];
END
GO

USE [VocabMasterDB];
GO

/* Optional mode table: File or SQLServer */
IF OBJECT_ID(N'dbo.StorageMode', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.StorageMode (
    ModeId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ModeName NVARCHAR(50) NOT NULL UNIQUE,
    IsActive BIT NOT NULL DEFAULT(0),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.StorageMode WHERE ModeName = N'File')
  INSERT INTO dbo.StorageMode (ModeName, IsActive) VALUES (N'File', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.StorageMode WHERE ModeName = N'SQLServer')
  INSERT INTO dbo.StorageMode (ModeName, IsActive) VALUES (N'SQLServer', 0);
GO

IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AppUser (
    UserId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    FullName NVARCHAR(255) NOT NULL,
    Email NVARCHAR(320) NOT NULL,
    PasswordPlain NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
  CREATE UNIQUE INDEX IX_AppUser_Email ON dbo.AppUser(Email);
END
GO

IF OBJECT_ID(N'dbo.Vocabulary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Vocabulary (
    VocabId BIGINT NOT NULL PRIMARY KEY,
    Word NVARCHAR(255) NOT NULL,
    IPA NVARCHAR(255) NULL,
    WordType NVARCHAR(100) NULL,
    DefinitionVi NVARCHAR(MAX) NULL,
    Difficulty INT NOT NULL DEFAULT(1),
    IsLearned BIT NOT NULL DEFAULT(0),
    NextReviewDate DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
  CREATE UNIQUE INDEX IX_Vocabulary_Word ON dbo.Vocabulary(Word);
END
GO

IF OBJECT_ID(N'dbo.VocabularyExample', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VocabularyExample (
    ExampleId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    VocabId BIGINT NOT NULL,
    ExampleEn NVARCHAR(MAX) NULL,
    ExampleVi NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_VocabularyExample_Vocabulary FOREIGN KEY (VocabId)
      REFERENCES dbo.Vocabulary(VocabId) ON DELETE CASCADE
  );
  CREATE INDEX IX_VocabularyExample_VocabId ON dbo.VocabularyExample(VocabId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.VocabularyAntonym', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VocabularyAntonym (
    VocabId BIGINT NOT NULL,
    Antonym NVARCHAR(255) NOT NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT PK_VocabularyAntonym PRIMARY KEY (VocabId, Antonym),
    CONSTRAINT FK_VocabularyAntonym_Vocabulary FOREIGN KEY (VocabId)
      REFERENCES dbo.Vocabulary(VocabId) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.VocabularyCollocation', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.VocabularyCollocation (
    VocabId BIGINT NOT NULL,
    Collocation NVARCHAR(255) NOT NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT PK_VocabularyCollocation PRIMARY KEY (VocabId, Collocation),
    CONSTRAINT FK_VocabularyCollocation_Vocabulary FOREIGN KEY (VocabId)
      REFERENCES dbo.Vocabulary(VocabId) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.Passage', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Passage (
    PassageId BIGINT NOT NULL PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    ContentHtml NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.PassageMedia', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PassageMedia (
    PassageMediaId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PassageId BIGINT NOT NULL,
    MediaType NVARCHAR(20) NOT NULL,
    MediaName NVARCHAR(500) NULL,
    MediaUrl NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_PassageMedia_Passage FOREIGN KEY (PassageId)
      REFERENCES dbo.Passage(PassageId) ON DELETE CASCADE
  );
  CREATE INDEX IX_PassageMedia_PassageId ON dbo.PassageMedia(PassageId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.PassageWord', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PassageWord (
    PassageWordId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PassageId BIGINT NOT NULL,
    VocabId BIGINT NULL,
    Word NVARCHAR(255) NOT NULL,
    IPA NVARCHAR(255) NULL,
    WordType NVARCHAR(100) NULL,
    DefinitionVi NVARCHAR(MAX) NULL,
    Difficulty INT NOT NULL DEFAULT(1),
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_PassageWord_Passage FOREIGN KEY (PassageId)
      REFERENCES dbo.Passage(PassageId) ON DELETE CASCADE,
    CONSTRAINT FK_PassageWord_Vocabulary FOREIGN KEY (VocabId)
      REFERENCES dbo.Vocabulary(VocabId) ON DELETE SET NULL
  );
  CREATE INDEX IX_PassageWord_PassageId ON dbo.PassageWord(PassageId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.PassageWordExample', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PassageWordExample (
    PassageWordExampleId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PassageWordId BIGINT NOT NULL,
    ExampleEn NVARCHAR(MAX) NULL,
    ExampleVi NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_PassageWordExample_PassageWord FOREIGN KEY (PassageWordId)
      REFERENCES dbo.PassageWord(PassageWordId) ON DELETE CASCADE
  );
  CREATE INDEX IX_PassageWordExample_PassageWordId ON dbo.PassageWordExample(PassageWordId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.PassageQuestion', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PassageQuestion (
    PassageQuestionId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PassageId BIGINT NOT NULL,
    QuestionType NVARCHAR(20) NOT NULL,
    QuestionText NVARCHAR(MAX) NOT NULL,
    OptionA NVARCHAR(MAX) NULL,
    OptionB NVARCHAR(MAX) NULL,
    OptionC NVARCHAR(MAX) NULL,
    OptionD NVARCHAR(MAX) NULL,
    CorrectAnswer NVARCHAR(MAX) NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_PassageQuestion_Passage FOREIGN KEY (PassageId)
      REFERENCES dbo.Passage(PassageId) ON DELETE CASCADE
  );
  CREATE INDEX IX_PassageQuestion_PassageId ON dbo.PassageQuestion(PassageId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.Grammar', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Grammar (
    GrammarId BIGINT NOT NULL PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    ContentHtml NVARCHAR(MAX) NULL,
    Color NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.CurriculumCourse', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumCourse (
    CourseId BIGINT NOT NULL PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.CurriculumDay', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumDay (
    DayId BIGINT NOT NULL PRIMARY KEY,
    CourseId BIGINT NOT NULL,
    DayLabel NVARCHAR(100) NULL,
    DayTitle NVARCHAR(500) NULL,
    Notes NVARCHAR(MAX) NULL,
    IsDone BIT NOT NULL DEFAULT(0),
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT FK_CurriculumDay_CurriculumCourse FOREIGN KEY (CourseId)
      REFERENCES dbo.CurriculumCourse(CourseId) ON DELETE CASCADE
  );
  CREATE INDEX IX_CurriculumDay_CourseId ON dbo.CurriculumDay(CourseId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.CurriculumDayVocabulary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumDayVocabulary (
    DayId BIGINT NOT NULL,
    VocabId BIGINT NOT NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT PK_CurriculumDayVocabulary PRIMARY KEY (DayId, VocabId),
    CONSTRAINT FK_CurriculumDayVocabulary_Day FOREIGN KEY (DayId)
      REFERENCES dbo.CurriculumDay(DayId) ON DELETE CASCADE,
    CONSTRAINT FK_CurriculumDayVocabulary_Vocabulary FOREIGN KEY (VocabId)
      REFERENCES dbo.Vocabulary(VocabId) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.CurriculumDayPassage', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumDayPassage (
    DayId BIGINT NOT NULL,
    PassageId BIGINT NOT NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT PK_CurriculumDayPassage PRIMARY KEY (DayId, PassageId),
    CONSTRAINT FK_CurriculumDayPassage_Day FOREIGN KEY (DayId)
      REFERENCES dbo.CurriculumDay(DayId) ON DELETE CASCADE,
    CONSTRAINT FK_CurriculumDayPassage_Passage FOREIGN KEY (PassageId)
      REFERENCES dbo.Passage(PassageId) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.CurriculumDayGrammar', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumDayGrammar (
    DayId BIGINT NOT NULL,
    GrammarId BIGINT NOT NULL,
    SortOrder INT NOT NULL DEFAULT(0),
    CONSTRAINT PK_CurriculumDayGrammar PRIMARY KEY (DayId, GrammarId),
    CONSTRAINT FK_CurriculumDayGrammar_Day FOREIGN KEY (DayId)
      REFERENCES dbo.CurriculumDay(DayId) ON DELETE CASCADE,
    CONSTRAINT FK_CurriculumDayGrammar_Grammar FOREIGN KEY (GrammarId)
      REFERENCES dbo.Grammar(GrammarId) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.CustomTopic', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CustomTopic (
    TopicId BIGINT NOT NULL PRIMARY KEY,
    Title NVARCHAR(255) NOT NULL,
    Icon NVARCHAR(20) NULL,
    Description NVARCHAR(MAX) NULL,
    Difficulty NVARCHAR(20) NULL,
    ColorTheme NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
  CREATE INDEX IX_CustomTopic_Title ON dbo.CustomTopic(Title);
END
GO

IF OBJECT_ID(N'dbo.CustomLesson', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CustomLesson (
    LessonId BIGINT NOT NULL PRIMARY KEY,
    TopicId BIGINT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Difficulty NVARCHAR(20) NULL,
    EstimatedDuration INT NOT NULL DEFAULT(5),
    SortOrder INT NOT NULL DEFAULT(1),
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    CONSTRAINT FK_CustomLesson_CustomTopic FOREIGN KEY (TopicId)
      REFERENCES dbo.CustomTopic(TopicId) ON DELETE CASCADE
  );
  CREATE INDEX IX_CustomLesson_TopicId ON dbo.CustomLesson(TopicId, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.CustomWord', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CustomWord (
    WordId BIGINT NOT NULL PRIMARY KEY,
    TopicId BIGINT NOT NULL,
    LessonId BIGINT NOT NULL,
    Word NVARCHAR(255) NOT NULL,
    MeaningVi NVARCHAR(MAX) NULL,
    Phonetic NVARCHAR(255) NULL,
    ExampleSentence NVARCHAR(MAX) NULL,
    ImageEmoji NVARCHAR(20) NULL,
    AudioText NVARCHAR(255) NULL,
    Difficulty NVARCHAR(20) NULL,
    PartOfSpeech NVARCHAR(50) NULL,
    Synonym NVARCHAR(255) NULL,
    Antonym NVARCHAR(255) NULL,
    Note NVARCHAR(MAX) NULL,
    TagsJson NVARCHAR(MAX) NULL,
    CorrectCount INT NOT NULL DEFAULT(0),
    WrongCount INT NOT NULL DEFAULT(0),
    ReviewScore INT NOT NULL DEFAULT(0),
    LastReviewedMs BIGINT NULL,
    NextReviewAtMs BIGINT NULL,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
    CONSTRAINT FK_CustomWord_CustomTopic FOREIGN KEY (TopicId)
      REFERENCES dbo.CustomTopic(TopicId) ON DELETE NO ACTION,
    CONSTRAINT FK_CustomWord_CustomLesson FOREIGN KEY (LessonId)
      REFERENCES dbo.CustomLesson(LessonId) ON DELETE CASCADE
  );
  CREATE INDEX IX_CustomWord_LessonId ON dbo.CustomWord(LessonId);
  CREATE INDEX IX_CustomWord_TopicId ON dbo.CustomWord(TopicId);
END
GO

/* Optional generic app metadata */
IF OBJECT_ID(N'dbo.AppMeta', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AppMeta (
    MetaKey NVARCHAR(200) NOT NULL PRIMARY KEY,
    MetaValue NVARCHAR(MAX) NULL,
    UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
  );
END
GO
