use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tiberius::{AuthMethod, Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

#[derive(Serialize)]
struct SqlConnectionResult {
  is_connected: bool,
  server: String,
  database: String,
  active_mode: Option<String>,
  vocabulary_count: i64,
  passage_count: i64,
  grammar_count: i64,
  curriculum_course_count: i64,
  curriculum_day_count: i64,
}

#[derive(Serialize)]
struct StorageModeSwitchResult {
  active_mode: Option<String>,
}

#[derive(Serialize)]
struct AuthUserResult {
  user_id: i64,
  full_name: String,
  email: String,
}

#[derive(Serialize)]
struct AuthActionResult {
  success: bool,
  message: String,
}

#[derive(Deserialize)]
struct VocabExampleInput {
  en: Option<String>,
  vi: Option<String>,
}

#[derive(Deserialize)]
struct VocabInput {
  id: i64,
  word: String,
  ipa: Option<String>,
  #[serde(rename = "type")]
  word_type: Option<String>,
  definition: Option<String>,
  difficulty: Option<i32>,
  #[serde(rename = "isLearned")]
  is_learned: Option<bool>,
  #[serde(rename = "nextReviewDate")]
  next_review_date: Option<i64>,
  examples: Option<Vec<VocabExampleInput>>,
  antonyms: Option<Vec<String>>,
  collocations: Option<Vec<String>>,
}

#[derive(Serialize)]
struct SyncVocabularyResult {
  synced_rows: usize,
}

#[derive(Serialize)]
struct SyncFullAppDataResult {
  synced: bool,
  payload_bytes: usize,
}

#[derive(Serialize)]
struct CustomTopicRow {
  id: i64,
  title: String,
  icon: String,
  description: String,
  difficulty: String,
  #[serde(rename = "colorTheme")]
  color_theme: String,
  #[serde(rename = "createdAt")]
  created_at: String,
  #[serde(rename = "updatedAt")]
  updated_at: String,
}

#[derive(Serialize)]
struct CustomLessonRow {
  id: i64,
  #[serde(rename = "topicId")]
  topic_id: i64,
  title: String,
  description: String,
  difficulty: String,
  #[serde(rename = "estimatedDuration")]
  estimated_duration: i64,
  #[serde(rename = "sortOrder")]
  sort_order: i64,
  #[serde(rename = "createdAt")]
  created_at: String,
  #[serde(rename = "updatedAt")]
  updated_at: String,
}

#[derive(Serialize)]
struct CustomWordRow {
  id: i64,
  #[serde(rename = "topicId")]
  topic_id: i64,
  #[serde(rename = "lessonId")]
  lesson_id: i64,
  word: String,
  meaning: String,
  phonetic: String,
  example: String,
  #[serde(rename = "imageEmoji")]
  image_emoji: String,
  #[serde(rename = "audioText")]
  audio_text: String,
  difficulty: String,
  #[serde(rename = "partOfSpeech")]
  part_of_speech: String,
  synonym: String,
  antonym: String,
  note: String,
  tags: Vec<String>,
  #[serde(rename = "correctCount")]
  correct_count: i64,
  #[serde(rename = "wrongCount")]
  wrong_count: i64,
  #[serde(rename = "reviewScore")]
  review_score: i64,
  #[serde(rename = "lastReviewed")]
  last_reviewed: Option<i64>,
  #[serde(rename = "nextReviewAt")]
  next_review_at: Option<i64>,
  #[serde(rename = "createdAt")]
  created_at: String,
  #[serde(rename = "updatedAt")]
  updated_at: String,
}

#[derive(Serialize)]
struct CustomManagerLoadResult {
  #[serde(rename = "customTopics")]
  custom_topics: Vec<CustomTopicRow>,
  #[serde(rename = "customLessons")]
  custom_lessons: Vec<CustomLessonRow>,
  #[serde(rename = "customWords")]
  custom_words: Vec<CustomWordRow>,
}

#[derive(Serialize)]
struct VocabOutput {
  id: i64,
  word: String,
  ipa: String,
  #[serde(rename = "type")]
  word_type: String,
  definition: String,
  difficulty: i32,
  #[serde(rename = "isLearned")]
  is_learned: bool,
  #[serde(rename = "nextReviewDate")]
  next_review_date: Option<i64>,
  examples: Vec<serde_json::Value>,
  antonyms: Vec<String>,
  collocations: Vec<String>,
}

fn sql_escape_nvarchar(value: &str) -> String {
  value.replace('\'', "''")
}

fn json_value_to_i64(value: Option<&serde_json::Value>) -> Option<i64> {
  match value {
    Some(serde_json::Value::Number(n)) => n
      .as_i64()
      .or_else(|| n.as_u64().and_then(|v| i64::try_from(v).ok()))
      .or_else(|| n.as_f64().map(|v| v.round() as i64)),
    Some(serde_json::Value::String(s)) => s.trim().parse::<i64>().ok(),
    _ => None,
  }
}

fn json_value_to_string(value: Option<&serde_json::Value>) -> String {
  match value {
    Some(serde_json::Value::String(s)) => s.clone(),
    Some(serde_json::Value::Number(n)) => n.to_string(),
    Some(serde_json::Value::Bool(b)) => {
      if *b {
        "true".to_string()
      } else {
        "false".to_string()
      }
    }
    _ => String::new(),
  }
}

fn json_value_to_bool(value: Option<&serde_json::Value>) -> bool {
  match value {
    Some(serde_json::Value::Bool(b)) => *b,
    Some(serde_json::Value::Number(n)) => n.as_i64().unwrap_or(0) != 0,
    Some(serde_json::Value::String(s)) => {
      let normalized = s.trim().to_lowercase();
      normalized == "true" || normalized == "1" || normalized == "yes"
    }
    _ => false,
  }
}

fn json_value_to_tags_json(value: Option<&serde_json::Value>) -> String {
  match value {
    Some(serde_json::Value::Array(arr)) => {
      serde_json::to_string(arr).unwrap_or_else(|_| "[]".to_string())
    }
    Some(serde_json::Value::String(s)) => {
      let tags: Vec<String> = s
        .split(',')
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect();
      serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string())
    }
    _ => "[]".to_string(),
  }
}

fn json_value_to_string_vec(value: Option<&serde_json::Value>) -> Vec<String> {
  match value {
    Some(serde_json::Value::Array(arr)) => arr
      .iter()
      .filter_map(|item| match item {
        serde_json::Value::String(s) => {
          let trimmed = s.trim();
          if trimmed.is_empty() {
            None
          } else {
            Some(trimmed.to_string())
          }
        }
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
      })
      .collect(),
    _ => Vec::new(),
  }
}

async fn open_sql_client(
  host: &str,
  port: u16,
  username: &str,
  password: &str,
  database: &str,
) -> Result<Client<tokio_util::compat::Compat<TcpStream>>, String> {
  let mut config = Config::new();
  config.host(host.trim());
  config.port(port);
  config.authentication(AuthMethod::sql_server(username.trim(), password));
  config.database(database.trim());
  config.trust_cert();

  let addr = config.get_addr();
  let tcp = TcpStream::connect(addr)
    .await
    .map_err(|e| format!("Không thể kết nối TCP tới SQL Server: {e}"))?;

  tcp
    .set_nodelay(true)
    .map_err(|e| format!("Không thể thiết lập TCP no-delay: {e}"))?;

  Client::connect(config, tcp.compat_write())
    .await
    .map_err(|e| format!("Kết nối SQL Server thất bại: {e}"))
}

async fn fetch_count(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
  table_name: &str,
) -> Result<i64, String> {
  let query = format!("SELECT COUNT_BIG(1) AS TotalRows FROM {table_name};");
  let mut stream = client
    .query(query.as_str(), &[])
    .await
    .map_err(|e| format!("Không thể query {table_name}: {e}"))?;

  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc kết quả {table_name}: {e}"))?
  {
    if let Some(row) = item.into_row() {
      let count: Option<i64> = row.get("TotalRows");
      return Ok(count.unwrap_or(0));
    }
  }

  Ok(0)
}

async fn fetch_active_mode(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
) -> Result<Option<String>, String> {
  let mut mode_stream = client
    .query(
      "SELECT
         MAX(CASE WHEN ModeName = N'SQLServer' AND IsActive = 1 THEN 1 ELSE 0 END) AS SqlServerActive,
         MAX(CASE WHEN ModeName = N'File'      AND IsActive = 1 THEN 1 ELSE 0 END) AS FileActive
       FROM dbo.StorageMode;",
      &[],
    )
    .await
    .map_err(|e| format!("Không thể đọc StorageMode: {e}"))?;

  while let Some(item) = mode_stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc dữ liệu StorageMode: {e}"))?
  {
    if let Some(row) = item.into_row() {
      let sql_active = row.get::<i32, _>("SqlServerActive").unwrap_or(0);
      let file_active = row.get::<i32, _>("FileActive").unwrap_or(0);

      if sql_active == 1 {
        return Ok(Some("SQLServer".to_string()));
      }
      if file_active == 1 {
        return Ok(Some("File".to_string()));
      }
      return Ok(None);
    }
  }

  Ok(None)
}

async fn ensure_auth_user_table(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
) -> Result<(), String> {
  let create_sql = "
    IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AppUser (
        UserId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FullName NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordPlain NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME()),
        UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
      );
    END;
  ";

  client
    .simple_query(create_sql)
    .await
    .map_err(|e| format!("Không thể khởi tạo bảng AppUser: {e}"))?;

  Ok(())
}

async fn ensure_app_meta_table(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
) -> Result<(), String> {
  let create_sql = "
    IF OBJECT_ID(N'dbo.AppMeta', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AppMeta (
        MetaKey NVARCHAR(200) NOT NULL PRIMARY KEY,
        MetaValue NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2(0) NOT NULL DEFAULT(SYSDATETIME())
      );
    END;
  ";

  client
    .simple_query(create_sql)
    .await
    .map_err(|e| format!("Không thể khởi tạo bảng AppMeta: {e}"))?;

  Ok(())
}

async fn ensure_custom_topic_table(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
) -> Result<(), String> {
  let create_sql = "
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
    END;

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
    END;

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
    END;
  ";

  client
    .simple_query(create_sql)
    .await
    .map_err(|e| format!("Không thể khởi tạo bảng CustomTopic: {e}"))?;

  Ok(())
}

async fn query_auth_user(
  client: &mut Client<tokio_util::compat::Compat<TcpStream>>,
  query: &str,
) -> Result<Option<AuthUserResult>, String> {
  let mut stream = client
    .query(query, &[])
    .await
    .map_err(|e| format!("Không thể query user: {e}"))?;

  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc dữ liệu user: {e}"))?
  {
    if let Some(row) = item.into_row() {
      let user_id = row.get::<i64, _>("UserId").unwrap_or(0);
      let full_name = row.get::<&str, _>("FullName").unwrap_or("").to_string();
      let email = row.get::<&str, _>("Email").unwrap_or("").to_string();
      return Ok(Some(AuthUserResult {
        user_id,
        full_name,
        email,
      }));
    }
  }

  Ok(None)
}

#[tauri::command]
async fn connect_sql_server(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
) -> Result<SqlConnectionResult, String> {
  if host.trim().is_empty() {
    return Err("Host SQL Server không được để trống".to_string());
  }
  if username.trim().is_empty() {
    return Err("Username SQL Server không được để trống".to_string());
  }
  if database.trim().is_empty() {
    return Err("Database không được để trống".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;

  let active_mode = fetch_active_mode(&mut client).await?;

  let vocabulary_count = fetch_count(&mut client, "dbo.Vocabulary").await?;
  let passage_count = fetch_count(&mut client, "dbo.Passage").await?;
  let grammar_count = fetch_count(&mut client, "dbo.Grammar").await?;
  let curriculum_course_count = fetch_count(&mut client, "dbo.CurriculumCourse").await?;
  let curriculum_day_count = fetch_count(&mut client, "dbo.CurriculumDay").await?;

  Ok(SqlConnectionResult {
    is_connected: true,
    server: format!("{}:{}", host.trim(), port),
    database: database.trim().to_string(),
    active_mode,
    vocabulary_count,
    passage_count,
    grammar_count,
    curriculum_course_count,
    curriculum_day_count,
  })
}

#[tauri::command]
async fn set_storage_mode(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  mode_name: String,
) -> Result<StorageModeSwitchResult, String> {
  let mode = match mode_name.trim().to_lowercase().as_str() {
    "sqlserver" => "SQLServer",
    "file" => "File",
    _ => return Err("Mode không hợp lệ. Chỉ chấp nhận SQLServer hoặc File".to_string()),
  };

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;

  let switch_sql = format!(
    "UPDATE dbo.StorageMode
     SET IsActive = CASE WHEN ModeName = N'{}' THEN 1 ELSE 0 END,
         UpdatedAt = SYSDATETIME();",
    mode
  );

  client
    .simple_query(switch_sql.as_str())
    .await
    .map_err(|e| format!("Không thể chuyển mode sang {}: {e}", mode))?;

  let active_mode = fetch_active_mode(&mut client).await?;

  Ok(StorageModeSwitchResult { active_mode })
}

#[tauri::command]
async fn sync_vocabulary_to_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  words: Vec<VocabInput>,
) -> Result<SyncVocabularyResult, String> {
  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  let mut seen_words: HashSet<String> = HashSet::new();

  client
    .simple_query(
      "BEGIN TRANSACTION;
       DELETE FROM dbo.VocabularyExample;
       DELETE FROM dbo.VocabularyAntonym;
       DELETE FROM dbo.VocabularyCollocation;
       DELETE FROM dbo.Vocabulary;
      ",
    )
    .await
    .map_err(|e| format!("Không thể reset dữ liệu Vocabulary: {e}"))?;

  for word in &words {
    let word_val = sql_escape_nvarchar(word.word.trim());
    if word_val.is_empty() {
      continue;
    }

    let word_key = word.word.trim().to_lowercase();
    if seen_words.contains(&word_key) {
      continue;
    }
    seen_words.insert(word_key);

    let ipa = sql_escape_nvarchar(word.ipa.as_deref().unwrap_or(""));
    let word_type = sql_escape_nvarchar(word.word_type.as_deref().unwrap_or(""));
    let definition = sql_escape_nvarchar(word.definition.as_deref().unwrap_or(""));
    let difficulty = word.difficulty.unwrap_or(1).max(1);
    let is_learned = if word.is_learned.unwrap_or(false) { 1 } else { 0 };

    let next_review_expr = if let Some(ms) = word.next_review_date {
      let seconds = ms / 1000;
      format!("DATEADD(SECOND, {seconds}, '1970-01-01')")
    } else {
      "NULL".to_string()
    };

    let insert_vocab_sql = format!(
      "INSERT INTO dbo.Vocabulary (VocabId, Word, IPA, WordType, DefinitionVi, Difficulty, IsLearned, NextReviewDate, UpdatedAt)
       VALUES ({}, N'{}', N'{}', N'{}', N'{}', {}, {}, {}, SYSDATETIME());",
      word.id, word_val, ipa, word_type, definition, difficulty, is_learned, next_review_expr
    );

    client
      .simple_query(insert_vocab_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert Vocabulary '{}': {e}", word.word))?;

    if let Some(examples) = &word.examples {
      for (idx, ex) in examples.iter().enumerate() {
        let en = sql_escape_nvarchar(ex.en.as_deref().unwrap_or(""));
        let vi = sql_escape_nvarchar(ex.vi.as_deref().unwrap_or(""));

        let insert_example_sql = format!(
          "INSERT INTO dbo.VocabularyExample (VocabId, ExampleEn, ExampleVi, SortOrder)
           VALUES ({}, N'{}', N'{}', {});",
          word.id, en, vi, idx
        );

        client
          .simple_query(insert_example_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert VocabularyExample '{}': {e}", word.word))?;
      }
    }

    if let Some(antonyms) = &word.antonyms {
      for (idx, antonym) in antonyms.iter().enumerate() {
        let antonym_val = sql_escape_nvarchar(antonym.trim());
        if antonym_val.is_empty() {
          continue;
        }

        let insert_antonym_sql = format!(
          "INSERT INTO dbo.VocabularyAntonym (VocabId, Antonym, SortOrder)
           VALUES ({}, N'{}', {});",
          word.id, antonym_val, idx
        );

        client
          .simple_query(insert_antonym_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert VocabularyAntonym '{}': {e}", word.word))?;
      }
    }

    if let Some(collocations) = &word.collocations {
      for (idx, collocation) in collocations.iter().enumerate() {
        let collocation_val = sql_escape_nvarchar(collocation.trim());
        if collocation_val.is_empty() {
          continue;
        }

        let insert_collocation_sql = format!(
          "INSERT INTO dbo.VocabularyCollocation (VocabId, Collocation, SortOrder)
           VALUES ({}, N'{}', {});",
          word.id, collocation_val, idx
        );

        client
          .simple_query(insert_collocation_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert VocabularyCollocation '{}': {e}", word.word))?;
      }
    }
  }

  client
    .simple_query("COMMIT TRANSACTION;")
    .await
    .map_err(|e| format!("Không thể commit dữ liệu Vocabulary: {e}"))?;

  Ok(SyncVocabularyResult {
    synced_rows: words.len(),
  })
}

#[tauri::command]
async fn load_vocabulary_from_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
) -> Result<Vec<VocabOutput>, String> {
  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;

  let mut stream = client
    .query(
      "SELECT VocabId, Word, IPA, WordType, DefinitionVi, Difficulty, IsLearned,
              CASE WHEN NextReviewDate IS NULL THEN NULL ELSE DATEDIFF_BIG(MILLISECOND, '1970-01-01', NextReviewDate) END AS NextReviewDateMs
       FROM dbo.Vocabulary
       ORDER BY VocabId DESC;",
      &[],
    )
    .await
    .map_err(|e| format!("Không thể query Vocabulary: {e}"))?;

  let mut rows = Vec::new();

  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc dữ liệu Vocabulary: {e}"))?
  {
    if let Some(row) = item.into_row() {
      let id = row.get::<i64, _>("VocabId").unwrap_or(0);
      let word = row.get::<&str, _>("Word").unwrap_or("").to_string();
      let ipa = row.get::<&str, _>("IPA").unwrap_or("").to_string();
      let word_type = row.get::<&str, _>("WordType").unwrap_or("").to_string();
      let definition = row
        .get::<&str, _>("DefinitionVi")
        .unwrap_or("")
        .to_string();
      let difficulty = row.get::<i32, _>("Difficulty").unwrap_or(1);
      let is_learned = row.get::<bool, _>("IsLearned").unwrap_or(false);
      let next_review_date = row.get::<i64, _>("NextReviewDateMs");

      rows.push(VocabOutput {
        id,
        word,
        ipa,
        word_type,
        definition,
        difficulty,
        is_learned,
        next_review_date,
        examples: vec![],
        antonyms: vec![],
        collocations: vec![],
      });
    }
  }

  Ok(rows)
}

#[tauri::command]
async fn sync_full_app_data_to_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  full_data_json: String,
) -> Result<SyncFullAppDataResult, String> {
  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_app_meta_table(&mut client).await?;
  ensure_custom_topic_table(&mut client).await?;
  let mut seen_vocab_words: HashSet<String> = HashSet::new();

  let payload = full_data_json.trim();
  if payload.is_empty() {
    return Err("Dữ liệu đồng bộ rỗng".to_string());
  }

  let payload_safe = sql_escape_nvarchar(payload);
  let merge_sql = format!(
    "MERGE dbo.AppMeta AS target
     USING (SELECT N'FullAppDataJson' AS MetaKey, N'{}' AS MetaValue) AS source
     ON target.MetaKey = source.MetaKey
     WHEN MATCHED THEN
       UPDATE SET target.MetaValue = source.MetaValue, target.UpdatedAt = SYSDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (MetaKey, MetaValue) VALUES (source.MetaKey, source.MetaValue);",
    payload_safe
  );

  client
    .simple_query(merge_sql.as_str())
    .await
    .map_err(|e| format!("Không thể đồng bộ dữ liệu tổng sang SQL: {e}"))?;

  let parsed: serde_json::Value =
    serde_json::from_str(payload).map_err(|e| format!("Dữ liệu JSON không hợp lệ: {e}"))?;

  let vocab_list = parsed
    .get("vocabList")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let passages = parsed
    .get("passages")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let grammar_list = parsed
    .get("grammarList")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let curriculum_list = parsed
    .get("curriculumList")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let custom_topics = parsed
    .get("customTopics")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let custom_lessons = parsed
    .get("customLessons")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  let custom_words = parsed
    .get("customWords")
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

  client
    .simple_query(
      "BEGIN TRANSACTION;
       DELETE FROM dbo.CurriculumDayVocabulary;
       DELETE FROM dbo.CurriculumDayPassage;
       DELETE FROM dbo.CurriculumDayGrammar;
       DELETE FROM dbo.CurriculumDay;
       DELETE FROM dbo.CurriculumCourse;
        DELETE FROM dbo.VocabularyExample;
        DELETE FROM dbo.VocabularyAntonym;
        DELETE FROM dbo.VocabularyCollocation;
        DELETE FROM dbo.Vocabulary;
       DELETE FROM dbo.PassageWordExample;
       DELETE FROM dbo.PassageWord;
       DELETE FROM dbo.PassageQuestion;
       DELETE FROM dbo.PassageMedia;
       DELETE FROM dbo.Passage;
      DELETE FROM dbo.Grammar;
      DELETE FROM dbo.CustomWord;
      DELETE FROM dbo.CustomLesson;
      DELETE FROM dbo.CustomTopic;",
    )
    .await
    .map_err(|e| format!("Không thể reset dữ liệu trước khi sync: {e}"))?;

  for vocab in &vocab_list {
    let vocab_id = json_value_to_i64(vocab.get("id")).unwrap_or(0);
    if vocab_id <= 0 {
      continue;
    }

    let word = json_value_to_string(vocab.get("word"));
    if word.trim().is_empty() {
      continue;
    }

    let word_key = word.trim().to_lowercase();
    if seen_vocab_words.contains(&word_key) {
      continue;
    }
    seen_vocab_words.insert(word_key);

    let ipa = json_value_to_string(vocab.get("ipa"));
    let word_type = json_value_to_string(vocab.get("type"));
    let definition = json_value_to_string(vocab.get("definition"));
    let difficulty = json_value_to_i64(vocab.get("difficulty")).unwrap_or(1).max(1);
    let is_learned = if json_value_to_bool(vocab.get("isLearned")) { 1 } else { 0 };
    let next_review_ms = json_value_to_i64(vocab.get("nextReviewDate"));

    let next_review_expr = if let Some(ms) = next_review_ms {
      let seconds = ms / 1000;
      format!("DATEADD(SECOND, {seconds}, '1970-01-01')")
    } else {
      "NULL".to_string()
    };

    let insert_vocab_sql = format!(
      "INSERT INTO dbo.Vocabulary (VocabId, Word, IPA, WordType, DefinitionVi, Difficulty, IsLearned, NextReviewDate, UpdatedAt)
       VALUES ({}, N'{}', N'{}', N'{}', N'{}', {}, {}, {}, SYSDATETIME());",
      vocab_id,
      sql_escape_nvarchar(word.trim()),
      sql_escape_nvarchar(&ipa),
      sql_escape_nvarchar(&word_type),
      sql_escape_nvarchar(&definition),
      difficulty,
      is_learned,
      next_review_expr
    );

    client
      .simple_query(insert_vocab_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert Vocabulary '{}': {e}", word))?;

    let examples = vocab
      .get("examples")
      .and_then(|v| v.as_array())
      .cloned()
      .unwrap_or_default();

    for (idx, ex) in examples.iter().enumerate() {
      let en = json_value_to_string(ex.get("en"));
      let vi = json_value_to_string(ex.get("vi"));

      let insert_example_sql = format!(
        "INSERT INTO dbo.VocabularyExample (VocabId, ExampleEn, ExampleVi, SortOrder)
         VALUES ({}, N'{}', N'{}', {});",
        vocab_id,
        sql_escape_nvarchar(&en),
        sql_escape_nvarchar(&vi),
        idx
      );

      client
        .simple_query(insert_example_sql.as_str())
        .await
        .map_err(|e| format!("Không thể insert VocabularyExample '{}': {e}", word))?;
    }

    let antonyms = json_value_to_string_vec(vocab.get("antonyms"));
    for (idx, antonym) in antonyms.iter().enumerate() {
      let insert_antonym_sql = format!(
        "INSERT INTO dbo.VocabularyAntonym (VocabId, Antonym, SortOrder)
         VALUES ({}, N'{}', {});",
        vocab_id,
        sql_escape_nvarchar(antonym),
        idx
      );

      client
        .simple_query(insert_antonym_sql.as_str())
        .await
        .map_err(|e| format!("Không thể insert VocabularyAntonym '{}': {e}", word))?;
    }

    let collocations = json_value_to_string_vec(vocab.get("collocations"));
    for (idx, collocation) in collocations.iter().enumerate() {
      let insert_collocation_sql = format!(
        "INSERT INTO dbo.VocabularyCollocation (VocabId, Collocation, SortOrder)
         VALUES ({}, N'{}', {});",
        vocab_id,
        sql_escape_nvarchar(collocation),
        idx
      );

      client
        .simple_query(insert_collocation_sql.as_str())
        .await
        .map_err(|e| format!("Không thể insert VocabularyCollocation '{}': {e}", word))?;
    }
  }

  for topic in &custom_topics {
    let topic_id = json_value_to_i64(topic.get("id")).unwrap_or(0);
    if topic_id <= 0 {
      continue;
    }

    let title = json_value_to_string(topic.get("title"));
    if title.trim().is_empty() {
      continue;
    }

    let icon = json_value_to_string(topic.get("icon"));
    let description = json_value_to_string(topic.get("description"));
    let difficulty = json_value_to_string(topic.get("difficulty"));
    let color_theme = json_value_to_string(topic.get("colorTheme"));

    let insert_topic_sql = format!(
      "INSERT INTO dbo.CustomTopic (TopicId, Title, Icon, Description, Difficulty, ColorTheme, UpdatedAt)
       VALUES ({}, N'{}', N'{}', N'{}', N'{}', N'{}', SYSDATETIME());",
      topic_id,
      sql_escape_nvarchar(title.trim()),
      sql_escape_nvarchar(&icon),
      sql_escape_nvarchar(&description),
      sql_escape_nvarchar(&difficulty),
      sql_escape_nvarchar(&color_theme),
    );

    client
      .simple_query(insert_topic_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert CustomTopic '{}': {e}", title))?;
  }

  for lesson in &custom_lessons {
    let lesson_id = json_value_to_i64(lesson.get("id")).unwrap_or(0);
    let topic_id = json_value_to_i64(lesson.get("topicId")).unwrap_or(0);
    if lesson_id <= 0 || topic_id <= 0 {
      continue;
    }

    let title = json_value_to_string(lesson.get("title"));
    if title.trim().is_empty() {
      continue;
    }

    let description = json_value_to_string(lesson.get("description"));
    let difficulty = json_value_to_string(lesson.get("difficulty"));
    let estimated_duration = json_value_to_i64(lesson.get("estimatedDuration")).unwrap_or(5);
    let sort_order = json_value_to_i64(lesson.get("sortOrder")).unwrap_or(1);

    let insert_lesson_sql = format!(
      "INSERT INTO dbo.CustomLesson (LessonId, TopicId, Title, Description, Difficulty, EstimatedDuration, SortOrder, UpdatedAt)
       SELECT {}, {}, N'{}', N'{}', N'{}', {}, {}, SYSDATETIME()
       WHERE EXISTS (SELECT 1 FROM dbo.CustomTopic WHERE TopicId = {});",
      lesson_id,
      topic_id,
      sql_escape_nvarchar(title.trim()),
      sql_escape_nvarchar(&description),
      sql_escape_nvarchar(&difficulty),
      estimated_duration,
      sort_order,
      topic_id
    );

    client
      .simple_query(insert_lesson_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert CustomLesson '{}': {e}", title))?;
  }

  for word in &custom_words {
    let word_id = json_value_to_i64(word.get("id")).unwrap_or(0);
    let topic_id = json_value_to_i64(word.get("topicId")).unwrap_or(0);
    let lesson_id = json_value_to_i64(word.get("lessonId")).unwrap_or(0);
    if word_id <= 0 || topic_id <= 0 || lesson_id <= 0 {
      continue;
    }

    let word_text = json_value_to_string(word.get("word"));
    if word_text.trim().is_empty() {
      continue;
    }

    let meaning = json_value_to_string(word.get("meaning"));
    let phonetic = json_value_to_string(word.get("phonetic"));
    let example = json_value_to_string(word.get("example"));
    let image_emoji = json_value_to_string(word.get("imageEmoji"));
    let audio_text = json_value_to_string(word.get("audioText"));
    let difficulty = json_value_to_string(word.get("difficulty"));
    let part_of_speech = json_value_to_string(word.get("partOfSpeech"));
    let synonym = json_value_to_string(word.get("synonym"));
    let antonym = json_value_to_string(word.get("antonym"));
    let note = json_value_to_string(word.get("note"));
    let tags_json = json_value_to_tags_json(word.get("tags"));
    let correct_count = json_value_to_i64(word.get("correctCount")).unwrap_or(0);
    let wrong_count = json_value_to_i64(word.get("wrongCount")).unwrap_or(0);
    let review_score = json_value_to_i64(word.get("reviewScore")).unwrap_or(0);
    let last_reviewed_ms = json_value_to_i64(word.get("lastReviewed")).unwrap_or(-1);
    let next_review_at_ms = json_value_to_i64(word.get("nextReviewAt")).unwrap_or(-1);

    let last_reviewed_sql = if last_reviewed_ms >= 0 {
      last_reviewed_ms.to_string()
    } else {
      "NULL".to_string()
    };
    let next_review_at_sql = if next_review_at_ms >= 0 {
      next_review_at_ms.to_string()
    } else {
      "NULL".to_string()
    };

    let insert_word_sql = format!(
      "INSERT INTO dbo.CustomWord (
         WordId, TopicId, LessonId, Word, MeaningVi, Phonetic, ExampleSentence,
         ImageEmoji, AudioText, Difficulty, PartOfSpeech, Synonym, Antonym, Note, TagsJson,
         CorrectCount, WrongCount, ReviewScore, LastReviewedMs, NextReviewAtMs, UpdatedAt
       )
       SELECT
         {}, {}, {}, N'{}', N'{}', N'{}', N'{}',
         N'{}', N'{}', N'{}', N'{}', N'{}', N'{}', N'{}', N'{}',
         {}, {}, {}, {}, {}, SYSDATETIME()
       WHERE EXISTS (SELECT 1 FROM dbo.CustomTopic WHERE TopicId = {})
         AND EXISTS (SELECT 1 FROM dbo.CustomLesson WHERE LessonId = {});",
      word_id,
      topic_id,
      lesson_id,
      sql_escape_nvarchar(word_text.trim()),
      sql_escape_nvarchar(&meaning),
      sql_escape_nvarchar(&phonetic),
      sql_escape_nvarchar(&example),
      sql_escape_nvarchar(&image_emoji),
      sql_escape_nvarchar(&audio_text),
      sql_escape_nvarchar(&difficulty),
      sql_escape_nvarchar(&part_of_speech),
      sql_escape_nvarchar(&synonym),
      sql_escape_nvarchar(&antonym),
      sql_escape_nvarchar(&note),
      sql_escape_nvarchar(&tags_json),
      correct_count,
      wrong_count,
      review_score,
      last_reviewed_sql,
      next_review_at_sql,
      topic_id,
      lesson_id
    );

    client
      .simple_query(insert_word_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert CustomWord '{}': {e}", word_text))?;
  }

  for passage in &passages {
    let id = json_value_to_i64(passage.get("id")).unwrap_or(0);
    if id <= 0 {
      continue;
    }

    let title = json_value_to_string(passage.get("title"));
    if title.trim().is_empty() {
      continue;
    }

    let content_html = json_value_to_string(passage.get("content"));
    let insert_sql = format!(
      "INSERT INTO dbo.Passage (PassageId, Title, ContentHtml, UpdatedAt)
       VALUES ({}, N'{}', N'{}', SYSDATETIME());",
      id,
      sql_escape_nvarchar(title.trim()),
      sql_escape_nvarchar(&content_html)
    );

    client
      .simple_query(insert_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert Passage '{}': {e}", title))?;

    let passage_words = passage
      .get("words")
      .and_then(|v| v.as_array())
      .cloned()
      .unwrap_or_default();

    for (word_sort, passage_word) in passage_words.iter().enumerate() {
      let word_text = json_value_to_string(passage_word.get("word"));
      if word_text.trim().is_empty() {
        continue;
      }

      let ipa = json_value_to_string(passage_word.get("ipa"));
      let word_type = json_value_to_string(passage_word.get("type"));
      let definition_vi = json_value_to_string(passage_word.get("definition"));
      let difficulty = json_value_to_i64(passage_word.get("difficulty")).unwrap_or(1).max(1);
      let vocab_id = json_value_to_i64(passage_word.get("id")).unwrap_or(0);

      let vocab_id_expr = if vocab_id > 0 {
        format!("CASE WHEN EXISTS (SELECT 1 FROM dbo.Vocabulary WHERE VocabId = {0}) THEN {0} ELSE NULL END", vocab_id)
      } else {
        "NULL".to_string()
      };

      let insert_passage_word_sql = format!(
        "INSERT INTO dbo.PassageWord (PassageId, VocabId, Word, IPA, WordType, DefinitionVi, Difficulty, SortOrder)
         OUTPUT INSERTED.PassageWordId AS PassageWordId
         VALUES ({}, {}, N'{}', N'{}', N'{}', N'{}', {}, {});",
        id,
        vocab_id_expr,
        sql_escape_nvarchar(word_text.trim()),
        sql_escape_nvarchar(&ipa),
        sql_escape_nvarchar(&word_type),
        sql_escape_nvarchar(&definition_vi),
        difficulty,
        word_sort,
      );

      let mut inserted_passage_word_id = 0_i64;
      let mut passage_word_stream = client
        .query(insert_passage_word_sql.as_str(), &[])
        .await
        .map_err(|e| format!("Không thể insert PassageWord '{}' (PassageId={}): {e}", word_text, id))?;

      while let Some(item) = passage_word_stream
        .try_next()
        .await
        .map_err(|e| format!("Không thể đọc PassageWordId '{}' (PassageId={}): {e}", word_text, id))?
      {
        if let Some(row) = item.into_row() {
          inserted_passage_word_id = row.get::<i64, _>("PassageWordId").unwrap_or(0);
        }
      }
      drop(passage_word_stream);

      if inserted_passage_word_id <= 0 {
        continue;
      }

      let examples = passage_word
        .get("examples")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

      for (example_sort, ex) in examples.iter().enumerate() {
        let en = json_value_to_string(ex.get("en"));
        let vi = json_value_to_string(ex.get("vi"));

        let insert_example_sql = format!(
          "INSERT INTO dbo.PassageWordExample (PassageWordId, ExampleEn, ExampleVi, SortOrder)
           VALUES ({}, N'{}', N'{}', {});",
          inserted_passage_word_id,
          sql_escape_nvarchar(&en),
          sql_escape_nvarchar(&vi),
          example_sort,
        );

        client
          .simple_query(insert_example_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert PassageWordExample '{}' (PassageId={}): {e}", word_text, id))?;
      }
    }
  }

  for grammar in &grammar_list {
    let id = json_value_to_i64(grammar.get("id")).unwrap_or(0);
    if id <= 0 {
      continue;
    }

    let title = json_value_to_string(grammar.get("title"));
    if title.trim().is_empty() {
      continue;
    }

    let content_html = json_value_to_string(grammar.get("content"));
    let color = json_value_to_string(grammar.get("color"));
    let insert_sql = format!(
      "INSERT INTO dbo.Grammar (GrammarId, Title, ContentHtml, Color, UpdatedAt)
       VALUES ({}, N'{}', N'{}', N'{}', SYSDATETIME());",
      id,
      sql_escape_nvarchar(title.trim()),
      sql_escape_nvarchar(&content_html),
      sql_escape_nvarchar(&color)
    );

    client
      .simple_query(insert_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert Grammar '{}': {e}", title))?;
  }

  for course in &curriculum_list {
    let course_id = json_value_to_i64(course.get("id")).unwrap_or(0);
    if course_id <= 0 {
      continue;
    }

    let course_title = json_value_to_string(course.get("title"));
    if course_title.trim().is_empty() {
      continue;
    }

    let course_description = json_value_to_string(course.get("description"));
    let insert_course_sql = format!(
      "INSERT INTO dbo.CurriculumCourse (CourseId, Title, Description, UpdatedAt)
       VALUES ({}, N'{}', N'{}', SYSDATETIME());",
      course_id,
      sql_escape_nvarchar(course_title.trim()),
      sql_escape_nvarchar(&course_description)
    );

    client
      .simple_query(insert_course_sql.as_str())
      .await
      .map_err(|e| format!("Không thể insert CurriculumCourse '{}': {e}", course_title))?;

    let days = course
      .get("days")
      .and_then(|v| v.as_array())
      .cloned()
      .unwrap_or_default();

    for (day_sort, day) in days.iter().enumerate() {
      let day_id = json_value_to_i64(day.get("id")).unwrap_or(0);
      if day_id <= 0 {
        continue;
      }

      let day_label = json_value_to_string(day.get("dayLabel"));
      let day_title = json_value_to_string(day.get("title"));
      let day_notes = json_value_to_string(day.get("notes"));
      let day_done = if json_value_to_bool(day.get("done")) { 1 } else { 0 };

      let insert_day_sql = format!(
        "INSERT INTO dbo.CurriculumDay (DayId, CourseId, DayLabel, DayTitle, Notes, IsDone, SortOrder)
         VALUES ({}, {}, N'{}', N'{}', N'{}', {}, {});",
        day_id,
        course_id,
        sql_escape_nvarchar(&day_label),
        sql_escape_nvarchar(&day_title),
        sql_escape_nvarchar(&day_notes),
        day_done,
        day_sort
      );

      client
        .simple_query(insert_day_sql.as_str())
        .await
        .map_err(|e| format!("Không thể insert CurriculumDay '{}': {e}", day_label))?;

      let vocab_ids = day
        .get("vocabIds")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

      for (idx, vocab_id_val) in vocab_ids.iter().enumerate() {
        let vocab_id = json_value_to_i64(Some(vocab_id_val)).unwrap_or(0);
        if vocab_id <= 0 {
          continue;
        }

        let insert_sql = format!(
          "INSERT INTO dbo.CurriculumDayVocabulary (DayId, VocabId, SortOrder)
           SELECT {}, {}, {}
           WHERE EXISTS (SELECT 1 FROM dbo.CurriculumDay WHERE DayId = {})
             AND EXISTS (SELECT 1 FROM dbo.Vocabulary WHERE VocabId = {});",
          day_id, vocab_id, idx, day_id, vocab_id
        );

        client
          .simple_query(insert_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert CurriculumDayVocabulary DayId={} VocabId={}: {e}", day_id, vocab_id))?;
      }

      let passage_ids = day
        .get("passageIds")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

      for (idx, passage_id_val) in passage_ids.iter().enumerate() {
        let passage_id = json_value_to_i64(Some(passage_id_val)).unwrap_or(0);
        if passage_id <= 0 {
          continue;
        }

        let insert_sql = format!(
          "INSERT INTO dbo.CurriculumDayPassage (DayId, PassageId, SortOrder)
           SELECT {}, {}, {}
           WHERE EXISTS (SELECT 1 FROM dbo.CurriculumDay WHERE DayId = {})
             AND EXISTS (SELECT 1 FROM dbo.Passage WHERE PassageId = {});",
          day_id, passage_id, idx, day_id, passage_id
        );

        client
          .simple_query(insert_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert CurriculumDayPassage DayId={} PassageId={}: {e}", day_id, passage_id))?;
      }

      let grammar_ids = day
        .get("grammarIds")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

      for (idx, grammar_id_val) in grammar_ids.iter().enumerate() {
        let grammar_id = json_value_to_i64(Some(grammar_id_val)).unwrap_or(0);
        if grammar_id <= 0 {
          continue;
        }

        let insert_sql = format!(
          "INSERT INTO dbo.CurriculumDayGrammar (DayId, GrammarId, SortOrder)
           SELECT {}, {}, {}
           WHERE EXISTS (SELECT 1 FROM dbo.CurriculumDay WHERE DayId = {})
             AND EXISTS (SELECT 1 FROM dbo.Grammar WHERE GrammarId = {});",
          day_id, grammar_id, idx, day_id, grammar_id
        );

        client
          .simple_query(insert_sql.as_str())
          .await
          .map_err(|e| format!("Không thể insert CurriculumDayGrammar DayId={} GrammarId={}: {e}", day_id, grammar_id))?;
      }
    }
  }

  client
    .simple_query("COMMIT TRANSACTION;")
    .await
    .map_err(|e| format!("Không thể commit sync Passage/Grammar: {e}"))?;

  Ok(SyncFullAppDataResult {
    synced: true,
    payload_bytes: payload.len(),
  })
}

#[tauri::command]
async fn load_full_app_data_from_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
) -> Result<Option<String>, String> {
  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_app_meta_table(&mut client).await?;

  let mut stream = client
    .query(
      "SELECT TOP 1 MetaValue
       FROM dbo.AppMeta
       WHERE MetaKey = N'FullAppDataJson';",
      &[],
    )
    .await
    .map_err(|e| format!("Không thể đọc dữ liệu tổng từ SQL: {e}"))?;

  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc row dữ liệu tổng từ SQL: {e}"))?
  {
    if let Some(row) = item.into_row() {
      let value = row.get::<&str, _>("MetaValue").map(|v| v.to_string());
      return Ok(value);
    }
  }

  Ok(None)
}

#[tauri::command]
async fn load_custom_manager_data_from_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
) -> Result<CustomManagerLoadResult, String> {
  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_custom_topic_table(&mut client).await?;

  let mut custom_topics = Vec::new();
  {
    let mut topic_stream = client
      .query(
        "SELECT
           TopicId,
           Title,
           ISNULL(Icon, N'') AS Icon,
           ISNULL(Description, N'') AS Description,
           ISNULL(Difficulty, N'easy') AS Difficulty,
           ISNULL(ColorTheme, N'blue') AS ColorTheme,
           CONVERT(NVARCHAR(30), CreatedAt, 127) AS CreatedAt,
           CONVERT(NVARCHAR(30), UpdatedAt, 127) AS UpdatedAt
         FROM dbo.CustomTopic
         ORDER BY UpdatedAt DESC;",
        &[],
      )
      .await
      .map_err(|e| format!("Không thể đọc bảng CustomTopic: {e}"))?;

    while let Some(item) = topic_stream
      .try_next()
      .await
      .map_err(|e| format!("Không thể đọc dữ liệu CustomTopic: {e}"))?
    {
      if let Some(row) = item.into_row() {
        custom_topics.push(CustomTopicRow {
          id: row.get::<i64, _>("TopicId").unwrap_or(0),
          title: row.get::<&str, _>("Title").unwrap_or("").to_string(),
          icon: row.get::<&str, _>("Icon").unwrap_or("").to_string(),
          description: row.get::<&str, _>("Description").unwrap_or("").to_string(),
          difficulty: row.get::<&str, _>("Difficulty").unwrap_or("easy").to_string(),
          color_theme: row.get::<&str, _>("ColorTheme").unwrap_or("blue").to_string(),
          created_at: row.get::<&str, _>("CreatedAt").unwrap_or("").to_string(),
          updated_at: row.get::<&str, _>("UpdatedAt").unwrap_or("").to_string(),
        });
      }
    }
  }

  let mut custom_lessons = Vec::new();
  {
    let mut lesson_stream = client
      .query(
        "SELECT
           LessonId,
           TopicId,
           Title,
           ISNULL(Description, N'') AS Description,
           ISNULL(Difficulty, N'easy') AS Difficulty,
           ISNULL(EstimatedDuration, 5) AS EstimatedDuration,
           ISNULL(SortOrder, 1) AS SortOrder,
           CONVERT(NVARCHAR(30), CreatedAt, 127) AS CreatedAt,
           CONVERT(NVARCHAR(30), UpdatedAt, 127) AS UpdatedAt
         FROM dbo.CustomLesson
         ORDER BY TopicId, SortOrder, UpdatedAt DESC;",
        &[],
      )
      .await
      .map_err(|e| format!("Không thể đọc bảng CustomLesson: {e}"))?;

    while let Some(item) = lesson_stream
      .try_next()
      .await
      .map_err(|e| format!("Không thể đọc dữ liệu CustomLesson: {e}"))?
    {
      if let Some(row) = item.into_row() {
        custom_lessons.push(CustomLessonRow {
          id: row.get::<i64, _>("LessonId").unwrap_or(0),
          topic_id: row.get::<i64, _>("TopicId").unwrap_or(0),
          title: row.get::<&str, _>("Title").unwrap_or("").to_string(),
          description: row.get::<&str, _>("Description").unwrap_or("").to_string(),
          difficulty: row.get::<&str, _>("Difficulty").unwrap_or("easy").to_string(),
          estimated_duration: row.get::<i32, _>("EstimatedDuration").unwrap_or(5) as i64,
          sort_order: row.get::<i32, _>("SortOrder").unwrap_or(1) as i64,
          created_at: row.get::<&str, _>("CreatedAt").unwrap_or("").to_string(),
          updated_at: row.get::<&str, _>("UpdatedAt").unwrap_or("").to_string(),
        });
      }
    }
  }

  let mut custom_words = Vec::new();
  {
    let mut word_stream = client
      .query(
        "SELECT
           WordId,
           TopicId,
           LessonId,
           Word,
           ISNULL(MeaningVi, N'') AS MeaningVi,
           ISNULL(Phonetic, N'') AS Phonetic,
           ISNULL(ExampleSentence, N'') AS ExampleSentence,
           ISNULL(ImageEmoji, N'📘') AS ImageEmoji,
           ISNULL(AudioText, N'') AS AudioText,
           ISNULL(Difficulty, N'easy') AS Difficulty,
           ISNULL(PartOfSpeech, N'noun') AS PartOfSpeech,
           ISNULL(Synonym, N'') AS Synonym,
           ISNULL(Antonym, N'') AS Antonym,
           ISNULL(Note, N'') AS Note,
           ISNULL(TagsJson, N'[]') AS TagsJson,
           ISNULL(CorrectCount, 0) AS CorrectCount,
           ISNULL(WrongCount, 0) AS WrongCount,
           ISNULL(ReviewScore, 0) AS ReviewScore,
           LastReviewedMs,
           NextReviewAtMs,
           CONVERT(NVARCHAR(30), CreatedAt, 127) AS CreatedAt,
           CONVERT(NVARCHAR(30), UpdatedAt, 127) AS UpdatedAt
         FROM dbo.CustomWord
         ORDER BY UpdatedAt DESC;",
        &[],
      )
      .await
      .map_err(|e| format!("Không thể đọc bảng CustomWord: {e}"))?;

    while let Some(item) = word_stream
      .try_next()
      .await
      .map_err(|e| format!("Không thể đọc dữ liệu CustomWord: {e}"))?
    {
      if let Some(row) = item.into_row() {
        let tags_raw = row.get::<&str, _>("TagsJson").unwrap_or("[]").to_string();
        let tags: Vec<String> = serde_json::from_str::<Vec<String>>(&tags_raw).unwrap_or_default();

        custom_words.push(CustomWordRow {
          id: row.get::<i64, _>("WordId").unwrap_or(0),
          topic_id: row.get::<i64, _>("TopicId").unwrap_or(0),
          lesson_id: row.get::<i64, _>("LessonId").unwrap_or(0),
          word: row.get::<&str, _>("Word").unwrap_or("").to_string(),
          meaning: row.get::<&str, _>("MeaningVi").unwrap_or("").to_string(),
          phonetic: row.get::<&str, _>("Phonetic").unwrap_or("").to_string(),
          example: row.get::<&str, _>("ExampleSentence").unwrap_or("").to_string(),
          image_emoji: row.get::<&str, _>("ImageEmoji").unwrap_or("📘").to_string(),
          audio_text: row.get::<&str, _>("AudioText").unwrap_or("").to_string(),
          difficulty: row.get::<&str, _>("Difficulty").unwrap_or("easy").to_string(),
          part_of_speech: row.get::<&str, _>("PartOfSpeech").unwrap_or("noun").to_string(),
          synonym: row.get::<&str, _>("Synonym").unwrap_or("").to_string(),
          antonym: row.get::<&str, _>("Antonym").unwrap_or("").to_string(),
          note: row.get::<&str, _>("Note").unwrap_or("").to_string(),
          tags,
          correct_count: row.get::<i32, _>("CorrectCount").unwrap_or(0) as i64,
          wrong_count: row.get::<i32, _>("WrongCount").unwrap_or(0) as i64,
          review_score: row.get::<i32, _>("ReviewScore").unwrap_or(0) as i64,
          last_reviewed: row.get::<i64, _>("LastReviewedMs"),
          next_review_at: row.get::<i64, _>("NextReviewAtMs"),
          created_at: row.get::<&str, _>("CreatedAt").unwrap_or("").to_string(),
          updated_at: row.get::<&str, _>("UpdatedAt").unwrap_or("").to_string(),
        });
      }
    }
  }

  Ok(CustomManagerLoadResult {
    custom_topics,
    custom_lessons,
    custom_words,
  })
}

#[tauri::command]
async fn delete_vocabulary_item_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  vocab_id: i64,
) -> Result<AuthActionResult, String> {
  if vocab_id <= 0 {
    return Err("VocabId không hợp lệ".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  let delete_sql = format!("DELETE FROM dbo.Vocabulary WHERE VocabId = {};", vocab_id);

  client
    .simple_query(delete_sql.as_str())
    .await
    .map_err(|e| format!("Không thể xóa Vocabulary {}: {e}", vocab_id))?;

  Ok(AuthActionResult {
    success: true,
    message: "Đã xóa từ vựng trên SQL".to_string(),
  })
}

#[tauri::command]
async fn delete_passage_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  passage_id: i64,
) -> Result<AuthActionResult, String> {
  if passage_id <= 0 {
    return Err("PassageId không hợp lệ".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  let delete_sql = format!("DELETE FROM dbo.Passage WHERE PassageId = {};", passage_id);

  client
    .simple_query(delete_sql.as_str())
    .await
    .map_err(|e| format!("Không thể xóa Passage {}: {e}", passage_id))?;

  Ok(AuthActionResult {
    success: true,
    message: "Đã xóa bài đọc trên SQL".to_string(),
  })
}

#[tauri::command]
async fn delete_grammar_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  grammar_id: i64,
) -> Result<AuthActionResult, String> {
  if grammar_id <= 0 {
    return Err("GrammarId không hợp lệ".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  let delete_sql = format!("DELETE FROM dbo.Grammar WHERE GrammarId = {};", grammar_id);

  client
    .simple_query(delete_sql.as_str())
    .await
    .map_err(|e| format!("Không thể xóa Grammar {}: {e}", grammar_id))?;

  Ok(AuthActionResult {
    success: true,
    message: "Đã xóa ngữ pháp trên SQL".to_string(),
  })
}

#[tauri::command]
async fn register_user_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  full_name: String,
  email: String,
  password_plain: String,
) -> Result<AuthUserResult, String> {
  let full_name_norm = full_name.trim();
  let email_norm = email.trim().to_lowercase();
  let password_norm = password_plain.trim();

  if full_name_norm.is_empty() || email_norm.is_empty() || password_norm.is_empty() {
    return Err("Vui lòng nhập đầy đủ họ tên, email và mật khẩu".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_auth_user_table(&mut client).await?;

  let email_safe = sql_escape_nvarchar(&email_norm);
  let check_sql = format!(
    "SELECT TOP 1 UserId, FullName, Email FROM dbo.AppUser WHERE Email = N'{}';",
    email_safe
  );

  if query_auth_user(&mut client, check_sql.as_str()).await?.is_some() {
    return Err("Email này đã tồn tại".to_string());
  }

  let full_name_safe = sql_escape_nvarchar(full_name_norm);
  let password_safe = sql_escape_nvarchar(password_norm);
  let insert_sql = format!(
    "INSERT INTO dbo.AppUser (FullName, Email, PasswordPlain, UpdatedAt)
     VALUES (N'{}', N'{}', N'{}', SYSDATETIME());",
    full_name_safe, email_safe, password_safe
  );

  client
    .simple_query(insert_sql.as_str())
    .await
    .map_err(|e| format!("Không thể tạo tài khoản: {e}"))?;

  let fetch_sql = format!(
    "SELECT TOP 1 UserId, FullName, Email FROM dbo.AppUser WHERE Email = N'{}';",
    email_safe
  );

  query_auth_user(&mut client, fetch_sql.as_str())
    .await?
    .ok_or_else(|| "Đăng ký xong nhưng không lấy được thông tin user".to_string())
}

#[tauri::command]
async fn login_user_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  email: String,
  password_plain: String,
) -> Result<AuthUserResult, String> {
  let email_norm = email.trim().to_lowercase();
  let password_norm = password_plain.trim();

  if email_norm.is_empty() || password_norm.is_empty() {
    return Err("Vui lòng nhập email và mật khẩu".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_auth_user_table(&mut client).await?;

  let email_safe = sql_escape_nvarchar(&email_norm);
  let password_safe = sql_escape_nvarchar(password_norm);
  let query_sql = format!(
    "SELECT TOP 1 UserId, FullName, Email
     FROM dbo.AppUser
     WHERE Email = N'{}' AND PasswordPlain = N'{}';",
    email_safe, password_safe
  );

  query_auth_user(&mut client, query_sql.as_str())
    .await?
    .ok_or_else(|| "Sai email hoặc mật khẩu".to_string())
}

#[tauri::command]
async fn forgot_password_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  email: String,
  new_password_plain: String,
) -> Result<AuthActionResult, String> {
  let email_norm = email.trim().to_lowercase();
  let new_password_norm = new_password_plain.trim();

  if email_norm.is_empty() || new_password_norm.is_empty() {
    return Err("Vui lòng nhập email và mật khẩu mới".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_auth_user_table(&mut client).await?;

  let email_safe = sql_escape_nvarchar(&email_norm);
  let new_password_safe = sql_escape_nvarchar(new_password_norm);
  let update_sql = format!(
    "UPDATE dbo.AppUser
     SET PasswordPlain = N'{}', UpdatedAt = SYSDATETIME()
     WHERE Email = N'{}';
     SELECT @@ROWCOUNT AS AffectedRows;",
    new_password_safe, email_safe
  );

  let mut stream = client
    .query(update_sql.as_str(), &[])
    .await
    .map_err(|e| format!("Không thể cập nhật mật khẩu: {e}"))?;

  let mut affected_rows = 0i64;
  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc kết quả cập nhật mật khẩu: {e}"))?
  {
    if let Some(row) = item.into_row() {
      affected_rows = row.get::<i64, _>("AffectedRows").unwrap_or(0);
      break;
    }
  }

  if affected_rows == 0 {
    return Err("Không tìm thấy email để đặt lại mật khẩu".to_string());
  }

  Ok(AuthActionResult {
    success: true,
    message: "Đặt lại mật khẩu thành công".to_string(),
  })
}

#[tauri::command]
async fn change_password_sql(
  host: String,
  port: u16,
  username: String,
  password: String,
  database: String,
  email: String,
  current_password_plain: String,
  new_password_plain: String,
) -> Result<AuthActionResult, String> {
  let email_norm = email.trim().to_lowercase();
  let current_password_norm = current_password_plain.trim();
  let new_password_norm = new_password_plain.trim();

  if email_norm.is_empty() || current_password_norm.is_empty() || new_password_norm.is_empty() {
    return Err("Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới".to_string());
  }

  let mut client = open_sql_client(&host, port, &username, &password, &database).await?;
  ensure_auth_user_table(&mut client).await?;

  let email_safe = sql_escape_nvarchar(&email_norm);
  let current_password_safe = sql_escape_nvarchar(current_password_norm);
  let new_password_safe = sql_escape_nvarchar(new_password_norm);

  let update_sql = format!(
    "UPDATE dbo.AppUser
     SET PasswordPlain = N'{}', UpdatedAt = SYSDATETIME()
     WHERE Email = N'{}' AND PasswordPlain = N'{}';
     SELECT @@ROWCOUNT AS AffectedRows;",
    new_password_safe, email_safe, current_password_safe
  );

  let mut stream = client
    .query(update_sql.as_str(), &[])
    .await
    .map_err(|e| format!("Không thể đổi mật khẩu: {e}"))?;

  let mut affected_rows = 0i64;
  while let Some(item) = stream
    .try_next()
    .await
    .map_err(|e| format!("Không thể đọc kết quả đổi mật khẩu: {e}"))?
  {
    if let Some(row) = item.into_row() {
      affected_rows = row.get::<i64, _>("AffectedRows").unwrap_or(0);
      break;
    }
  }

  if affected_rows == 0 {
    return Err("Mật khẩu cũ không đúng hoặc email không tồn tại".to_string());
  }

  Ok(AuthActionResult {
    success: true,
    message: "Đổi mật khẩu thành công".to_string(),
  })
}

#[tauri::command]
fn generate_edge_tts_audio(text: String, voice: Option<String>) -> Result<String, String> {
  let trimmed_text = text.trim();
  if trimmed_text.is_empty() {
    return Err("Văn bản trống, không thể đọc".to_string());
  }

  let voice_name = voice.unwrap_or_else(|| "en-US-AriaNeural".to_string());
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|e| format!("Không thể lấy thời gian hệ thống: {e}"))?
    .as_millis();

  let output_file = std::env::temp_dir().join(format!("vocabmaster_tts_{timestamp}.mp3"));

  let status = Command::new("edge-tts")
    .arg("--text")
    .arg(trimmed_text)
    .arg("--voice")
    .arg(&voice_name)
    .arg("--write-media")
    .arg(&output_file)
    .status()
    .map_err(|e| format!("Không thể chạy edge-tts: {e}"))?;

  if !status.success() {
    return Err("edge-tts chạy thất bại. Hãy kiểm tra cài đặt Python và edge-tts".to_string());
  }

  let audio_bytes = fs::read(&output_file)
    .map_err(|e| format!("Không thể đọc file âm thanh sinh ra từ edge-tts: {e}"))?;

  let _ = fs::remove_file(&output_file);

  Ok(BASE64_STANDARD.encode(audio_bytes))
}

#[tauri::command]
fn save_backup_file(file_name: String, data_json: String) -> Result<String, String> {
  let safe_file_name = file_name
    .chars()
    .map(|c| match c {
      '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
      _ => c,
    })
    .collect::<String>();

  let target_dir: PathBuf = std::env::var("USERPROFILE")
    .map(PathBuf::from)
    .map(|p| p.join("Downloads"))
    .unwrap_or_else(|_| std::env::temp_dir());

  if !target_dir.exists() {
    std::fs::create_dir_all(&target_dir)
      .map_err(|e| format!("Không thể tạo thư mục lưu backup: {e}"))?;
  }

  let target_path = target_dir.join(safe_file_name);

  fs::write(&target_path, data_json)
    .map_err(|e| format!("Không thể ghi file backup: {e}"))?;

  Ok(target_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      generate_edge_tts_audio,
      save_backup_file,
      connect_sql_server,
      set_storage_mode,
      sync_vocabulary_to_sql,
      load_vocabulary_from_sql,
      sync_full_app_data_to_sql,
      load_full_app_data_from_sql,
      load_custom_manager_data_from_sql,
      delete_vocabulary_item_sql,
      delete_passage_sql,
      delete_grammar_sql,
      register_user_sql,
      login_user_sql,
      forgot_password_sql,
      change_password_sql
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
