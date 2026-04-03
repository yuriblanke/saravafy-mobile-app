[
  {
    "schema_investigation": {
      "tables": [
        {
          "table_name": "auth_login_attempts",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "attempt_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "user_id",
          "ordinal_position": 3,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "provider",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": "'google'::text",
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "event",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "client_ts",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "platform",
          "ordinal_position": 7,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "os_version",
          "ordinal_position": 8,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "app_version",
          "ordinal_position": 9,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "build_number",
          "ordinal_position": 10,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "network_type",
          "ordinal_position": 11,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "network_details",
          "ordinal_position": 12,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "browser_details",
          "ordinal_position": 13,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "details",
          "ordinal_position": 14,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "NO",
          "column_default": "'{}'::jsonb",
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "created_at",
          "ordinal_position": 15,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "auth_login_attempts",
          "column_name": "session_id",
          "ordinal_position": 16,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "title",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "description",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "is_public",
          "ordinal_position": 4,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "created_at",
          "ordinal_position": 5,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "updated_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "owner_user_id",
          "ordinal_position": 7,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "owner_terreiro_id",
          "ordinal_position": 8,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections",
          "column_name": "visibility",
          "ordinal_position": 10,
          "data_type": "USER-DEFINED",
          "udt_name": "collection_visibility",
          "is_nullable": "NO",
          "column_default": "'public'::collection_visibility",
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "collection_id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "ponto_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "position",
          "ordinal_position": 3,
          "data_type": "integer",
          "udt_name": "int4",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "added_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "added_by",
          "ordinal_position": 5,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "ponto_versao_id",
          "ordinal_position": 6,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "entidade_id",
          "ordinal_position": 7,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "entidade_texto",
          "ordinal_position": 8,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "entidade_linha_texto",
          "ordinal_position": 9,
          "data_type": "USER-DEFINED",
          "udt_name": "entidade_linha",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "collections_pontos",
          "column_name": "entidade_orixa_id",
          "ordinal_position": 10,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "subject_type",
          "ordinal_position": 2,
          "data_type": "USER-DEFINED",
          "udt_name": "consent_subject_type",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "subject_id",
          "ordinal_position": 3,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "party_role",
          "ordinal_position": 4,
          "data_type": "USER-DEFINED",
          "udt_name": "consent_party_role",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "party_name",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "party_user_id",
          "ordinal_position": 6,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "status",
          "ordinal_position": 7,
          "data_type": "USER-DEFINED",
          "udt_name": "consent_status",
          "is_nullable": "NO",
          "column_default": "'unknown'::consent_status",
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "accepted_at",
          "ordinal_position": 8,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "accepted_by",
          "ordinal_position": 9,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "terms_version",
          "ordinal_position": 10,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "source_submission_id",
          "ordinal_position": 11,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "created_at",
          "ordinal_position": 12,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "consents",
          "column_name": "updated_at",
          "ordinal_position": 13,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "email",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "status",
          "ordinal_position": 3,
          "data_type": "USER-DEFINED",
          "udt_name": "curator_invite_status",
          "is_nullable": "NO",
          "column_default": "'pending'::curator_invite_status",
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "created_by",
          "ordinal_position": 4,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "created_at",
          "ordinal_position": 5,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "responded_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "accepted_by",
          "ordinal_position": 7,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "curator_invites",
          "column_name": "expires_at",
          "ordinal_position": 8,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "(now() + '30 days'::interval)",
          "character_maximum_length": null
        },
        {
          "table_name": "curators",
          "column_name": "user_id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "curators",
          "column_name": "created_at",
          "ordinal_position": 2,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "dev_masters",
          "column_name": "user_id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "dev_masters",
          "column_name": "created_at",
          "ordinal_position": 2,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "entidade_aliases",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "entidade_aliases",
          "column_name": "entidade_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "entidade_aliases",
          "column_name": "nome",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "entidade_aliases",
          "column_name": "created_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "nome",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "linha",
          "ordinal_position": 3,
          "data_type": "USER-DEFINED",
          "udt_name": "entidade_linha",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "orixá_id",
          "ordinal_position": 4,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "is_active",
          "ordinal_position": 5,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "entidades",
          "column_name": "created_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "orixa_dictionary",
          "column_name": "key",
          "ordinal_position": 1,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "orixa_dictionary",
          "column_name": "canonical_tag",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "orixa_dictionary",
          "column_name": "variants",
          "ordinal_position": 3,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "NO",
          "column_default": "'{}'::text[]",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "ponto_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "storage_bucket",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": "'ponto-audios'::text",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "storage_path",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "mime_type",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "size_bytes",
          "ordinal_position": 6,
          "data_type": "bigint",
          "udt_name": "int8",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "duration_ms",
          "ordinal_position": 7,
          "data_type": "integer",
          "udt_name": "int4",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "created_by",
          "ordinal_position": 8,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "created_at",
          "ordinal_position": 9,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "interpreter_name",
          "ordinal_position": 13,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "upload_status",
          "ordinal_position": 16,
          "data_type": "USER-DEFINED",
          "udt_name": "audio_upload_status",
          "is_nullable": "NO",
          "column_default": "'pending'::audio_upload_status",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "upload_token",
          "ordinal_position": 17,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "uploaded_at",
          "ordinal_position": 18,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "is_active",
          "ordinal_position": 19,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "content_etag",
          "ordinal_position": 20,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "sha256",
          "ordinal_position": 21,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "updated_at",
          "ordinal_position": 22,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_audios",
          "column_name": "ponto_versao_id",
          "ordinal_position": 23,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "ponto_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "action",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "changed_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "changed_by",
          "ordinal_position": 5,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "before",
          "ordinal_position": 6,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_change_logs",
          "column_name": "after",
          "ordinal_position": 7,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "ponto_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "versao_num",
          "ordinal_position": 3,
          "data_type": "integer",
          "udt_name": "int4",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "is_canonical",
          "ordinal_position": 4,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "title",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "lyrics",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "lyrics_preview_6",
          "ordinal_position": 7,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "lyrics_sync",
          "ordinal_position": 8,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "tags",
          "ordinal_position": 9,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "NO",
          "column_default": "'{}'::text[]",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "author_name",
          "ordinal_position": 10,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "is_public_domain",
          "ordinal_position": 11,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "source_submission_id",
          "ordinal_position": 12,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "created_by",
          "ordinal_position": 13,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "curated_by",
          "ordinal_position": 14,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "is_active",
          "ordinal_position": 15,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "title_norm",
          "ordinal_position": 16,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "search_tsv",
          "ordinal_position": 17,
          "data_type": "tsvector",
          "udt_name": "tsvector",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "created_at",
          "ordinal_position": 18,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "ponto_versoes",
          "column_name": "updated_at",
          "ordinal_position": 19,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "title",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "tags",
          "ordinal_position": 9,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "YES",
          "column_default": "'{}'::text[]",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "is_active",
          "ordinal_position": 10,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "created_at",
          "ordinal_position": 11,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "updated_at",
          "ordinal_position": 12,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "restricted",
          "ordinal_position": 14,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "search_text",
          "ordinal_position": 15,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "search_tsv",
          "ordinal_position": 16,
          "data_type": "tsvector",
          "udt_name": "tsvector",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "search_tags_extra",
          "ordinal_position": 17,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "title_norm",
          "ordinal_position": 18,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "created_by",
          "ordinal_position": 21,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "curated_by",
          "ordinal_position": 22,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "author_name",
          "ordinal_position": 24,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "is_public_domain",
          "ordinal_position": 28,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos",
          "column_name": "entidade_id",
          "ordinal_position": 29,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "title",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "duration_seconds",
          "ordinal_position": 3,
          "data_type": "integer",
          "udt_name": "int4",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "cover_url",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "lyrics",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "lyrics_sync",
          "ordinal_position": 6,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "tags",
          "ordinal_position": 7,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "is_active",
          "ordinal_position": 8,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "created_at",
          "ordinal_position": 9,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "updated_at",
          "ordinal_position": 10,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "restricted",
          "ordinal_position": 11,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "search_text",
          "ordinal_position": 12,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "search_tsv",
          "ordinal_position": 13,
          "data_type": "tsvector",
          "udt_name": "tsvector",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "search_tags_extra",
          "ordinal_position": 14,
          "data_type": "ARRAY",
          "udt_name": "_text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "title_norm",
          "ordinal_position": 15,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "lyrics_preview_6",
          "ordinal_position": 16,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "created_by",
          "ordinal_position": 17,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "curated_by",
          "ordinal_position": 18,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "source_submission_id",
          "ordinal_position": 19,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "author_name",
          "ordinal_position": 20,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_backup_20250329",
          "column_name": "is_public_domain",
          "ordinal_position": 21,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "kind",
          "ordinal_position": 2,
          "data_type": "USER-DEFINED",
          "udt_name": "ponto_submission_kind",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "status",
          "ordinal_position": 3,
          "data_type": "USER-DEFINED",
          "udt_name": "ponto_submission_status",
          "is_nullable": "NO",
          "column_default": "'pending'::ponto_submission_status",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "created_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "created_by",
          "ordinal_position": 5,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "auth.uid()",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "reviewed_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "reviewed_by",
          "ordinal_position": 7,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "ponto_id",
          "ordinal_position": 8,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "payload",
          "ordinal_position": 9,
          "data_type": "jsonb",
          "udt_name": "jsonb",
          "is_nullable": "NO",
          "column_default": "'{}'::jsonb",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "ponto_is_public_domain",
          "ordinal_position": 10,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "author_name",
          "ordinal_position": 11,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "author_consent_granted",
          "ordinal_position": 12,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "terms_version",
          "ordinal_position": 13,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "has_audio",
          "ordinal_position": 14,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "interpreter_name",
          "ordinal_position": 15,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "interpreter_consent_granted",
          "ordinal_position": 16,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "audio_bucket_id",
          "ordinal_position": 17,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "audio_object_path",
          "ordinal_position": 18,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "ponto_audio_id",
          "ordinal_position": 19,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "review_note",
          "ordinal_position": 20,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "pontos_submissions",
          "column_name": "ponto_versao_id",
          "ordinal_position": 21,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "created_at",
          "ordinal_position": 2,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "updated_at",
          "ordinal_position": 3,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "primary_terreiro_id",
          "ordinal_position": 4,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "curator_mode_enabled",
          "ordinal_position": 5,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "email",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "full_name",
          "ordinal_position": 7,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "avatar_url",
          "ordinal_position": 8,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "auth_provider",
          "ordinal_position": 9,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "email_verified",
          "ordinal_position": 10,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "profiles",
          "column_name": "identity_updated_at",
          "ordinal_position": 11,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "public_app_config",
          "column_name": "key",
          "ordinal_position": 1,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "public_app_config",
          "column_name": "value",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "public_app_config",
          "column_name": "updated_at",
          "ordinal_position": 3,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "terreiro_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "email",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "role",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "created_by",
          "ordinal_position": 5,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "status",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": "'pending'::text",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "created_at",
          "ordinal_position": 7,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "activated_at",
          "ordinal_position": 8,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_invites",
          "column_name": "activated_by",
          "ordinal_position": 9,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "terreiro_id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "user_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "role",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "created_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "email",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_members",
          "column_name": "status",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": "'active'::text",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "terreiro_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "user_id",
          "ordinal_position": 3,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "status",
          "ordinal_position": 4,
          "data_type": "USER-DEFINED",
          "udt_name": "terreiro_membership_request_status",
          "is_nullable": "NO",
          "column_default": "'pending'::terreiro_membership_request_status",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "message",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "created_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "reviewed_at",
          "ordinal_position": 7,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "reviewed_by",
          "ordinal_position": 8,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_membership_requests",
          "column_name": "review_note",
          "ordinal_position": 9,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "terreiro_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "ponto_id",
          "ordinal_position": 3,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "tag_text",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "tag_text_normalized",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "source",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "template_key",
          "ordinal_position": 7,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "created_by",
          "ordinal_position": 8,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "created_at",
          "ordinal_position": 9,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "column_name": "updated_at",
          "ordinal_position": 10,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "title",
          "ordinal_position": 2,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "created_by",
          "ordinal_position": 3,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "created_at",
          "ordinal_position": 4,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "about",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "lines_of_work",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "updated_at",
          "ordinal_position": 9,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros",
          "column_name": "cover_image_url",
          "ordinal_position": 10,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "terreiro_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "kind",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": "'principal'::text",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "city",
          "ordinal_position": 4,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "state",
          "ordinal_position": 5,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "neighborhood",
          "ordinal_position": 6,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "address",
          "ordinal_position": 7,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "phone_whatsapp",
          "ordinal_position": 8,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "instagram_handle",
          "ordinal_position": 9,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "is_primary",
          "ordinal_position": 10,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "is_active",
          "ordinal_position": 11,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "true",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "created_by",
          "ordinal_position": 12,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "created_at",
          "ordinal_position": 13,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "updated_at",
          "ordinal_position": 14,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_contatos",
          "column_name": "phone_is_whatsapp",
          "ordinal_position": 15,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "id",
          "ordinal_position": 1,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": "gen_random_uuid()",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "terreiro_id",
          "ordinal_position": 2,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "name",
          "ordinal_position": 3,
          "data_type": "text",
          "udt_name": "text",
          "is_nullable": "NO",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "is_primary",
          "ordinal_position": 4,
          "data_type": "boolean",
          "udt_name": "bool",
          "is_nullable": "NO",
          "column_default": "false",
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "created_by",
          "ordinal_position": 5,
          "data_type": "uuid",
          "udt_name": "uuid",
          "is_nullable": "YES",
          "column_default": null,
          "character_maximum_length": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "column_name": "created_at",
          "ordinal_position": 6,
          "data_type": "timestamp with time zone",
          "udt_name": "timestamptz",
          "is_nullable": "NO",
          "column_default": "now()",
          "character_maximum_length": null
        }
      ],
      "constraints": [
        {
          "table_name": "auth_login_attempts",
          "constraint_name": "auth_login_attempts_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "auth_login_attempts",
          "constraint_name": "auth_login_attempts_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "auth_login_attempts",
          "foreign_column": "id"
        },
        {
          "table_name": "collections",
          "constraint_name": "collections_owner_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "owner_terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "collections",
          "constraint_name": "collections_owner_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "owner_user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "collections",
          "constraint_name": "collections_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "collections",
          "foreign_column": "id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_collection_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "collection_id",
          "foreign_table": "collections",
          "foreign_column": "id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_ponto_versao_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_versao_id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_entidade_orixa_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "entidade_orixa_id",
          "foreign_table": "entidades",
          "foreign_column": "id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_added_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "added_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "collection_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "collection_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "collection_id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "ponto_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "ponto_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "collection_id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_unique_position",
          "constraint_type": "UNIQUE",
          "column_name": "position",
          "foreign_table": "collections_pontos",
          "foreign_column": "position"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_unique_position",
          "constraint_type": "UNIQUE",
          "column_name": "position",
          "foreign_table": "collections_pontos",
          "foreign_column": "collection_id"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_unique_position",
          "constraint_type": "UNIQUE",
          "column_name": "collection_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "position"
        },
        {
          "table_name": "collections_pontos",
          "constraint_name": "collections_pontos_unique_position",
          "constraint_type": "UNIQUE",
          "column_name": "collection_id",
          "foreign_table": "collections_pontos",
          "foreign_column": "collection_id"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_party_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "party_user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_accepted_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "accepted_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "consents",
          "foreign_column": "id"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "party_role",
          "foreign_table": "consents",
          "foreign_column": "subject_id"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_id",
          "foreign_table": "consents",
          "foreign_column": "subject_id"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_id",
          "foreign_table": "consents",
          "foreign_column": "subject_type"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "party_role",
          "foreign_table": "consents",
          "foreign_column": "party_role"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "party_role",
          "foreign_table": "consents",
          "foreign_column": "subject_type"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_type",
          "foreign_table": "consents",
          "foreign_column": "party_role"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_type",
          "foreign_table": "consents",
          "foreign_column": "subject_id"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_type",
          "foreign_table": "consents",
          "foreign_column": "subject_type"
        },
        {
          "table_name": "consents",
          "constraint_name": "consents_unique_subject_role",
          "constraint_type": "UNIQUE",
          "column_name": "subject_id",
          "foreign_table": "consents",
          "foreign_column": "party_role"
        },
        {
          "table_name": "curator_invites",
          "constraint_name": "curator_invites_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "curator_invites",
          "constraint_name": "curator_invites_accepted_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "accepted_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "curator_invites",
          "constraint_name": "curator_invites_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "curator_invites",
          "foreign_column": "id"
        },
        {
          "table_name": "curators",
          "constraint_name": "curators_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "curators",
          "constraint_name": "curators_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "user_id",
          "foreign_table": "curators",
          "foreign_column": "user_id"
        },
        {
          "table_name": "dev_masters",
          "constraint_name": "dev_masters_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "dev_masters",
          "constraint_name": "dev_masters_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "user_id",
          "foreign_table": "dev_masters",
          "foreign_column": "user_id"
        },
        {
          "table_name": "entidade_aliases",
          "constraint_name": "entidade_aliases_entidade_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "entidade_id",
          "foreign_table": "entidades",
          "foreign_column": "id"
        },
        {
          "table_name": "entidade_aliases",
          "constraint_name": "entidade_aliases_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "entidade_aliases",
          "foreign_column": "id"
        },
        {
          "table_name": "entidade_aliases",
          "constraint_name": "entidade_aliases_nome_unique",
          "constraint_type": "UNIQUE",
          "column_name": "nome",
          "foreign_table": "entidade_aliases",
          "foreign_column": "nome"
        },
        {
          "table_name": "entidades",
          "constraint_name": "entidades_orixa_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "orixá_id",
          "foreign_table": "entidades",
          "foreign_column": "id"
        },
        {
          "table_name": "entidades",
          "constraint_name": "entidades_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "entidades",
          "foreign_column": "id"
        },
        {
          "table_name": "entidades",
          "constraint_name": "entidades_nome_unique",
          "constraint_type": "UNIQUE",
          "column_name": "nome",
          "foreign_table": "entidades",
          "foreign_column": "nome"
        },
        {
          "table_name": "orixa_dictionary",
          "constraint_name": "orixa_dictionary_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "key",
          "foreign_table": "orixa_dictionary",
          "foreign_column": "key"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_versao_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_versao_id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "ponto_audios",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_bucket",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_path"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_id_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "ponto_audios",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_id_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_path"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_id_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_path",
          "foreign_table": "ponto_audios",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_ponto_id_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_path",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_path"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_bucket",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_bucket"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_path",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_path"
        },
        {
          "table_name": "ponto_audios",
          "constraint_name": "ponto_audios_storage_path_unique",
          "constraint_type": "UNIQUE",
          "column_name": "storage_path",
          "foreign_table": "ponto_audios",
          "foreign_column": "storage_bucket"
        },
        {
          "table_name": "ponto_change_logs",
          "constraint_name": "ponto_change_logs_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_change_logs",
          "constraint_name": "ponto_change_logs_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "ponto_change_logs",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_source_submission_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "source_submission_id",
          "foreign_table": "pontos_submissions",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "id"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_unique_num",
          "constraint_type": "UNIQUE",
          "column_name": "versao_num",
          "foreign_table": "ponto_versoes",
          "foreign_column": "versao_num"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_unique_num",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_unique_num",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "versao_num"
        },
        {
          "table_name": "ponto_versoes",
          "constraint_name": "ponto_versoes_unique_num",
          "constraint_type": "UNIQUE",
          "column_name": "versao_num",
          "foreign_table": "ponto_versoes",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "pontos",
          "constraint_name": "pontos_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "pontos",
          "constraint_name": "pontos_curated_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "curated_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "pontos",
          "constraint_name": "pontos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_ponto_versao_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_versao_id",
          "foreign_table": "ponto_versoes",
          "foreign_column": "id"
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_reviewed_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "reviewed_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_ponto_audio_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_audio_id",
          "foreign_table": "ponto_audios",
          "foreign_column": "id"
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "pontos_submissions",
          "constraint_name": "pontos_submissions_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "pontos_submissions",
          "foreign_column": "id"
        },
        {
          "table_name": "profiles",
          "constraint_name": "profiles_primary_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "primary_terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "profiles",
          "constraint_name": "profiles_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "profiles",
          "constraint_name": "profiles_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "profiles",
          "foreign_column": "id"
        },
        {
          "table_name": "public_app_config",
          "constraint_name": "public_app_config_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "key",
          "foreign_table": "public_app_config",
          "foreign_column": "key"
        },
        {
          "table_name": "terreiro_invites",
          "constraint_name": "terreiro_invites_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_invites",
          "constraint_name": "terreiro_invites_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiro_invites",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "user_id",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiro_members",
          "foreign_column": "user_id"
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiro_members",
          "foreign_column": "terreiro_id"
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "user_id",
          "foreign_table": "terreiro_members",
          "foreign_column": "user_id"
        },
        {
          "table_name": "terreiro_members",
          "constraint_name": "terreiro_members_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "user_id",
          "foreign_table": "terreiro_members",
          "foreign_column": "terreiro_id"
        },
        {
          "table_name": "terreiro_membership_requests",
          "constraint_name": "terreiro_membership_requests_reviewed_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "reviewed_by",
          "foreign_table": "profiles",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_membership_requests",
          "constraint_name": "terreiro_membership_requests_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_membership_requests",
          "constraint_name": "terreiro_membership_requests_user_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "user_id",
          "foreign_table": "profiles",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_membership_requests",
          "constraint_name": "terreiro_membership_requests_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiro_membership_requests",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "terreiro_ponto_custom_tags_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "terreiro_ponto_custom_tags_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "terreiro_ponto_custom_tags_ponto_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "ponto_id",
          "foreign_table": "pontos",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "terreiro_ponto_custom_tags_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "terreiro_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "terreiro_id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "terreiro_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "terreiro_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "tag_text_normalized"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "tag_text_normalized"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "ponto_id",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "terreiro_id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "tag_text_normalized",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "ponto_id"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "tag_text_normalized",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "tag_text_normalized"
        },
        {
          "table_name": "terreiro_ponto_custom_tags",
          "constraint_name": "uq_tpc_terreiro_ponto_tag",
          "constraint_type": "UNIQUE",
          "column_name": "tag_text_normalized",
          "foreign_table": "terreiro_ponto_custom_tags",
          "foreign_column": "terreiro_id"
        },
        {
          "table_name": "terreiros",
          "constraint_name": "terreiros_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "terreiros",
          "constraint_name": "terreiros_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiros_contatos",
          "constraint_name": "terreiros_contatos_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiros_contatos",
          "constraint_name": "terreiros_contatos_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "terreiros_contatos",
          "constraint_name": "terreiros_contatos_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiros_contatos",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiros_responsaveis",
          "constraint_name": "terreiros_responsaveis_terreiro_id_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "terreiro_id",
          "foreign_table": "terreiros",
          "foreign_column": "id"
        },
        {
          "table_name": "terreiros_responsaveis",
          "constraint_name": "terreiros_responsaveis_created_by_fkey",
          "constraint_type": "FOREIGN KEY",
          "column_name": "created_by",
          "foreign_table": null,
          "foreign_column": null
        },
        {
          "table_name": "terreiros_responsaveis",
          "constraint_name": "terreiros_responsaveis_pkey",
          "constraint_type": "PRIMARY KEY",
          "column_name": "id",
          "foreign_table": "terreiros_responsaveis",
          "foreign_column": "id"
        }
      ],
      "indexes": [
        {
          "tablename": "auth_login_attempts",
          "indexname": "auth_login_attempts_pkey",
          "indexdef": "CREATE UNIQUE INDEX auth_login_attempts_pkey ON public.auth_login_attempts USING btree (id)"
        },
        {
          "tablename": "auth_login_attempts",
          "indexname": "idx_auth_login_attempts_attempt_created_at",
          "indexdef": "CREATE INDEX idx_auth_login_attempts_attempt_created_at ON public.auth_login_attempts USING btree (attempt_id, created_at)"
        },
        {
          "tablename": "auth_login_attempts",
          "indexname": "idx_auth_login_attempts_attempt_id",
          "indexdef": "CREATE INDEX idx_auth_login_attempts_attempt_id ON public.auth_login_attempts USING btree (attempt_id)"
        },
        {
          "tablename": "auth_login_attempts",
          "indexname": "idx_auth_login_attempts_created_at",
          "indexdef": "CREATE INDEX idx_auth_login_attempts_created_at ON public.auth_login_attempts USING btree (created_at)"
        },
        {
          "tablename": "auth_login_attempts",
          "indexname": "idx_auth_login_attempts_provider_event_created_at",
          "indexdef": "CREATE INDEX idx_auth_login_attempts_provider_event_created_at ON public.auth_login_attempts USING btree (provider, event, created_at DESC)"
        },
        {
          "tablename": "auth_login_attempts",
          "indexname": "idx_auth_login_attempts_user_id",
          "indexdef": "CREATE INDEX idx_auth_login_attempts_user_id ON public.auth_login_attempts USING btree (user_id)"
        },
        {
          "tablename": "collections",
          "indexname": "collections_owner_terreiro_id_idx",
          "indexdef": "CREATE INDEX collections_owner_terreiro_id_idx ON public.collections USING btree (owner_terreiro_id)"
        },
        {
          "tablename": "collections",
          "indexname": "collections_owner_user_id_idx",
          "indexdef": "CREATE INDEX collections_owner_user_id_idx ON public.collections USING btree (owner_user_id)"
        },
        {
          "tablename": "collections",
          "indexname": "collections_pkey",
          "indexdef": "CREATE UNIQUE INDEX collections_pkey ON public.collections USING btree (id)"
        },
        {
          "tablename": "collections",
          "indexname": "idx_collections_visibility",
          "indexdef": "CREATE INDEX idx_collections_visibility ON public.collections USING btree (visibility)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "collections_pontos_collection_id_idx",
          "indexdef": "CREATE INDEX collections_pontos_collection_id_idx ON public.collections_pontos USING btree (collection_id)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "collections_pontos_pkey",
          "indexdef": "CREATE UNIQUE INDEX collections_pontos_pkey ON public.collections_pontos USING btree (collection_id, ponto_id)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "collections_pontos_ponto_id_idx",
          "indexdef": "CREATE INDEX collections_pontos_ponto_id_idx ON public.collections_pontos USING btree (ponto_id)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "collections_pontos_unique_position",
          "indexdef": "CREATE UNIQUE INDEX collections_pontos_unique_position ON public.collections_pontos USING btree (collection_id, \"position\")"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "idx_collections_pontos_entidade_id",
          "indexdef": "CREATE INDEX idx_collections_pontos_entidade_id ON public.collections_pontos USING btree (entidade_id)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "idx_collections_pontos_entidade_orixa_id",
          "indexdef": "CREATE INDEX idx_collections_pontos_entidade_orixa_id ON public.collections_pontos USING btree (entidade_orixa_id)"
        },
        {
          "tablename": "collections_pontos",
          "indexname": "idx_collections_pontos_ponto_versao_id",
          "indexdef": "CREATE INDEX idx_collections_pontos_ponto_versao_id ON public.collections_pontos USING btree (ponto_versao_id)"
        },
        {
          "tablename": "consents",
          "indexname": "consents_pkey",
          "indexdef": "CREATE UNIQUE INDEX consents_pkey ON public.consents USING btree (id)"
        },
        {
          "tablename": "consents",
          "indexname": "consents_status_idx",
          "indexdef": "CREATE INDEX consents_status_idx ON public.consents USING btree (status)"
        },
        {
          "tablename": "consents",
          "indexname": "consents_subject_idx",
          "indexdef": "CREATE INDEX consents_subject_idx ON public.consents USING btree (subject_type, subject_id)"
        },
        {
          "tablename": "consents",
          "indexname": "consents_unique_subject_role",
          "indexdef": "CREATE UNIQUE INDEX consents_unique_subject_role ON public.consents USING btree (subject_type, subject_id, party_role)"
        },
        {
          "tablename": "curator_invites",
          "indexname": "curator_invites_email_lower_idx",
          "indexdef": "CREATE INDEX curator_invites_email_lower_idx ON public.curator_invites USING btree (lower(email))"
        },
        {
          "tablename": "curator_invites",
          "indexname": "curator_invites_pkey",
          "indexdef": "CREATE UNIQUE INDEX curator_invites_pkey ON public.curator_invites USING btree (id)"
        },
        {
          "tablename": "curator_invites",
          "indexname": "curator_invites_unique_pending_email",
          "indexdef": "CREATE UNIQUE INDEX curator_invites_unique_pending_email ON public.curator_invites USING btree (lower(email)) WHERE (status = 'pending'::curator_invite_status)"
        },
        {
          "tablename": "curators",
          "indexname": "curators_pkey",
          "indexdef": "CREATE UNIQUE INDEX curators_pkey ON public.curators USING btree (user_id)"
        },
        {
          "tablename": "dev_masters",
          "indexname": "dev_masters_pkey",
          "indexdef": "CREATE UNIQUE INDEX dev_masters_pkey ON public.dev_masters USING btree (user_id)"
        },
        {
          "tablename": "entidade_aliases",
          "indexname": "entidade_aliases_nome_unique",
          "indexdef": "CREATE UNIQUE INDEX entidade_aliases_nome_unique ON public.entidade_aliases USING btree (nome)"
        },
        {
          "tablename": "entidade_aliases",
          "indexname": "entidade_aliases_pkey",
          "indexdef": "CREATE UNIQUE INDEX entidade_aliases_pkey ON public.entidade_aliases USING btree (id)"
        },
        {
          "tablename": "entidade_aliases",
          "indexname": "idx_entidade_aliases_entidade_id",
          "indexdef": "CREATE INDEX idx_entidade_aliases_entidade_id ON public.entidade_aliases USING btree (entidade_id)"
        },
        {
          "tablename": "entidade_aliases",
          "indexname": "idx_entidade_aliases_nome",
          "indexdef": "CREATE INDEX idx_entidade_aliases_nome ON public.entidade_aliases USING btree (nome)"
        },
        {
          "tablename": "entidades",
          "indexname": "entidades_nome_unique",
          "indexdef": "CREATE UNIQUE INDEX entidades_nome_unique ON public.entidades USING btree (nome)"
        },
        {
          "tablename": "entidades",
          "indexname": "entidades_pkey",
          "indexdef": "CREATE UNIQUE INDEX entidades_pkey ON public.entidades USING btree (id)"
        },
        {
          "tablename": "entidades",
          "indexname": "idx_entidades_linha",
          "indexdef": "CREATE INDEX idx_entidades_linha ON public.entidades USING btree (linha)"
        },
        {
          "tablename": "entidades",
          "indexname": "idx_entidades_nome",
          "indexdef": "CREATE INDEX idx_entidades_nome ON public.entidades USING btree (nome)"
        },
        {
          "tablename": "entidades",
          "indexname": "idx_entidades_orixa_id",
          "indexdef": "CREATE INDEX idx_entidades_orixa_id ON public.entidades USING btree (\"orixá_id\")"
        },
        {
          "tablename": "orixa_dictionary",
          "indexname": "orixa_dictionary_pkey",
          "indexdef": "CREATE UNIQUE INDEX orixa_dictionary_pkey ON public.orixa_dictionary USING btree (key)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "idx_ponto_audios_created_at",
          "indexdef": "CREATE INDEX idx_ponto_audios_created_at ON public.ponto_audios USING btree (created_at)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "idx_ponto_audios_ponto_id",
          "indexdef": "CREATE INDEX idx_ponto_audios_ponto_id ON public.ponto_audios USING btree (ponto_id)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "idx_ponto_audios_ponto_versao_id",
          "indexdef": "CREATE INDEX idx_ponto_audios_ponto_versao_id ON public.ponto_audios USING btree (ponto_versao_id)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_pkey",
          "indexdef": "CREATE UNIQUE INDEX ponto_audios_pkey ON public.ponto_audios USING btree (id)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_ponto_id_idx",
          "indexdef": "CREATE INDEX ponto_audios_ponto_id_idx ON public.ponto_audios USING btree (ponto_id)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_ponto_id_storage_path_unique",
          "indexdef": "CREATE UNIQUE INDEX ponto_audios_ponto_id_storage_path_unique ON public.ponto_audios USING btree (ponto_id, storage_path)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_status_idx",
          "indexdef": "CREATE INDEX ponto_audios_status_idx ON public.ponto_audios USING btree (upload_status)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_storage_path_unique",
          "indexdef": "CREATE UNIQUE INDEX ponto_audios_storage_path_unique ON public.ponto_audios USING btree (storage_bucket, storage_path)"
        },
        {
          "tablename": "ponto_audios",
          "indexname": "ponto_audios_upload_token_uidx",
          "indexdef": "CREATE UNIQUE INDEX ponto_audios_upload_token_uidx ON public.ponto_audios USING btree (upload_token)"
        },
        {
          "tablename": "ponto_change_logs",
          "indexname": "idx_ponto_change_logs_ponto_id_changed_at",
          "indexdef": "CREATE INDEX idx_ponto_change_logs_ponto_id_changed_at ON public.ponto_change_logs USING btree (ponto_id, changed_at DESC)"
        },
        {
          "tablename": "ponto_change_logs",
          "indexname": "ponto_change_logs_pkey",
          "indexdef": "CREATE UNIQUE INDEX ponto_change_logs_pkey ON public.ponto_change_logs USING btree (id)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "idx_ponto_versoes_created_by",
          "indexdef": "CREATE INDEX idx_ponto_versoes_created_by ON public.ponto_versoes USING btree (created_by)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "idx_ponto_versoes_ponto_id",
          "indexdef": "CREATE INDEX idx_ponto_versoes_ponto_id ON public.ponto_versoes USING btree (ponto_id)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "idx_ponto_versoes_search_tsv",
          "indexdef": "CREATE INDEX idx_ponto_versoes_search_tsv ON public.ponto_versoes USING gin (search_tsv)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "idx_ponto_versoes_title_norm_trgm",
          "indexdef": "CREATE INDEX idx_ponto_versoes_title_norm_trgm ON public.ponto_versoes USING gin (title_norm gin_trgm_ops)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "ponto_versoes_pkey",
          "indexdef": "CREATE UNIQUE INDEX ponto_versoes_pkey ON public.ponto_versoes USING btree (id)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "ponto_versoes_unique_num",
          "indexdef": "CREATE UNIQUE INDEX ponto_versoes_unique_num ON public.ponto_versoes USING btree (ponto_id, versao_num)"
        },
        {
          "tablename": "ponto_versoes",
          "indexname": "uq_ponto_versoes_canonical",
          "indexdef": "CREATE UNIQUE INDEX uq_ponto_versoes_canonical ON public.ponto_versoes USING btree (ponto_id) WHERE (is_canonical = true)"
        },
        {
          "tablename": "pontos",
          "indexname": "idx_pontos_author_name",
          "indexdef": "CREATE INDEX idx_pontos_author_name ON public.pontos USING btree (author_name)"
        },
        {
          "tablename": "pontos",
          "indexname": "idx_pontos_created_by",
          "indexdef": "CREATE INDEX idx_pontos_created_by ON public.pontos USING btree (created_by)"
        },
        {
          "tablename": "pontos",
          "indexname": "idx_pontos_curated_by",
          "indexdef": "CREATE INDEX idx_pontos_curated_by ON public.pontos USING btree (curated_by)"
        },
        {
          "tablename": "pontos",
          "indexname": "idx_pontos_entidade_id",
          "indexdef": "CREATE INDEX idx_pontos_entidade_id ON public.pontos USING btree (entidade_id)"
        },
        {
          "tablename": "pontos",
          "indexname": "idx_pontos_search_tsv",
          "indexdef": "CREATE INDEX idx_pontos_search_tsv ON public.pontos USING gin (search_tsv)"
        },
        {
          "tablename": "pontos",
          "indexname": "pontos_pkey",
          "indexdef": "CREATE UNIQUE INDEX pontos_pkey ON public.pontos USING btree (id)"
        },
        {
          "tablename": "pontos",
          "indexname": "pontos_search_tsv_gin",
          "indexdef": "CREATE INDEX pontos_search_tsv_gin ON public.pontos USING gin (search_tsv)"
        },
        {
          "tablename": "pontos",
          "indexname": "pontos_tags_gin",
          "indexdef": "CREATE INDEX pontos_tags_gin ON public.pontos USING gin (tags)"
        },
        {
          "tablename": "pontos",
          "indexname": "pontos_title_norm_trgm_gin",
          "indexdef": "CREATE INDEX pontos_title_norm_trgm_gin ON public.pontos USING gin (title_norm gin_trgm_ops)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "idx_pontos_submissions_kind_status",
          "indexdef": "CREATE INDEX idx_pontos_submissions_kind_status ON public.pontos_submissions USING btree (kind, status)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "idx_pontos_submissions_ponto_audio_id",
          "indexdef": "CREATE INDEX idx_pontos_submissions_ponto_audio_id ON public.pontos_submissions USING btree (ponto_audio_id)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "idx_pontos_submissions_ponto_versao_id",
          "indexdef": "CREATE INDEX idx_pontos_submissions_ponto_versao_id ON public.pontos_submissions USING btree (ponto_versao_id)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "pontos_submissions_created_by_idx",
          "indexdef": "CREATE INDEX pontos_submissions_created_by_idx ON public.pontos_submissions USING btree (created_by)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "pontos_submissions_kind_idx",
          "indexdef": "CREATE INDEX pontos_submissions_kind_idx ON public.pontos_submissions USING btree (kind)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "pontos_submissions_pkey",
          "indexdef": "CREATE UNIQUE INDEX pontos_submissions_pkey ON public.pontos_submissions USING btree (id)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "pontos_submissions_status_idx",
          "indexdef": "CREATE INDEX pontos_submissions_status_idx ON public.pontos_submissions USING btree (status)"
        },
        {
          "tablename": "pontos_submissions",
          "indexname": "uniq_pontos_submissions_audio_upload",
          "indexdef": "CREATE UNIQUE INDEX uniq_pontos_submissions_audio_upload ON public.pontos_submissions USING btree (ponto_audio_id) WHERE (kind = 'audio_upload'::ponto_submission_kind)"
        },
        {
          "tablename": "profiles",
          "indexname": "idx_profiles_primary_terreiro_id",
          "indexdef": "CREATE INDEX idx_profiles_primary_terreiro_id ON public.profiles USING btree (primary_terreiro_id)"
        },
        {
          "tablename": "profiles",
          "indexname": "profiles_pkey",
          "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
        },
        {
          "tablename": "public_app_config",
          "indexname": "public_app_config_pkey",
          "indexdef": "CREATE UNIQUE INDEX public_app_config_pkey ON public.public_app_config USING btree (key)"
        },
        {
          "tablename": "terreiro_invites",
          "indexname": "terreiro_invites_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiro_invites_pkey ON public.terreiro_invites USING btree (id)"
        },
        {
          "tablename": "terreiro_invites",
          "indexname": "ux_terreiro_invites_pending",
          "indexdef": "CREATE UNIQUE INDEX ux_terreiro_invites_pending ON public.terreiro_invites USING btree (terreiro_id, lower(email)) WHERE (status = 'pending'::text)"
        },
        {
          "tablename": "terreiro_members",
          "indexname": "terreiro_members_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiro_members_pkey ON public.terreiro_members USING btree (terreiro_id, user_id)"
        },
        {
          "tablename": "terreiro_members",
          "indexname": "terreiro_members_terreiro_id_idx",
          "indexdef": "CREATE INDEX terreiro_members_terreiro_id_idx ON public.terreiro_members USING btree (terreiro_id)"
        },
        {
          "tablename": "terreiro_members",
          "indexname": "terreiro_members_terreiro_user_uniq",
          "indexdef": "CREATE UNIQUE INDEX terreiro_members_terreiro_user_uniq ON public.terreiro_members USING btree (terreiro_id, user_id)"
        },
        {
          "tablename": "terreiro_members",
          "indexname": "terreiro_members_user_id_idx",
          "indexdef": "CREATE INDEX terreiro_members_user_id_idx ON public.terreiro_members USING btree (user_id)"
        },
        {
          "tablename": "terreiro_members",
          "indexname": "ux_terreiro_members_unique",
          "indexdef": "CREATE UNIQUE INDEX ux_terreiro_members_unique ON public.terreiro_members USING btree (terreiro_id, user_id)"
        },
        {
          "tablename": "terreiro_membership_requests",
          "indexname": "idx_tmr_terreiro_status_created",
          "indexdef": "CREATE INDEX idx_tmr_terreiro_status_created ON public.terreiro_membership_requests USING btree (terreiro_id, status, created_at DESC)"
        },
        {
          "tablename": "terreiro_membership_requests",
          "indexname": "terreiro_membership_requests_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiro_membership_requests_pkey ON public.terreiro_membership_requests USING btree (id)"
        },
        {
          "tablename": "terreiro_membership_requests",
          "indexname": "ux_tmr_pending_once",
          "indexdef": "CREATE UNIQUE INDEX ux_tmr_pending_once ON public.terreiro_membership_requests USING btree (terreiro_id, user_id) WHERE (status = 'pending'::terreiro_membership_request_status)"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "indexname": "idx_tpc_tag_trgm",
          "indexdef": "CREATE INDEX idx_tpc_tag_trgm ON public.terreiro_ponto_custom_tags USING gin (tag_text gin_trgm_ops)"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "indexname": "idx_tpc_terreiro_norm",
          "indexdef": "CREATE INDEX idx_tpc_terreiro_norm ON public.terreiro_ponto_custom_tags USING btree (terreiro_id, tag_text_normalized)"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "indexname": "idx_tpc_terreiro_ponto",
          "indexdef": "CREATE INDEX idx_tpc_terreiro_ponto ON public.terreiro_ponto_custom_tags USING btree (terreiro_id, ponto_id)"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "indexname": "terreiro_ponto_custom_tags_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiro_ponto_custom_tags_pkey ON public.terreiro_ponto_custom_tags USING btree (id)"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "indexname": "uq_tpc_terreiro_ponto_tag",
          "indexdef": "CREATE UNIQUE INDEX uq_tpc_terreiro_ponto_tag ON public.terreiro_ponto_custom_tags USING btree (terreiro_id, ponto_id, tag_text_normalized)"
        },
        {
          "tablename": "terreiros",
          "indexname": "terreiros_created_by_idx",
          "indexdef": "CREATE INDEX terreiros_created_by_idx ON public.terreiros USING btree (created_by)"
        },
        {
          "tablename": "terreiros",
          "indexname": "terreiros_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiros_pkey ON public.terreiros USING btree (id)"
        },
        {
          "tablename": "terreiros",
          "indexname": "terreiros_title_idx",
          "indexdef": "CREATE INDEX terreiros_title_idx ON public.terreiros USING btree (title)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_city_state",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_city_state ON public.terreiros_contatos USING btree (state, city)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_state",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_state ON public.terreiros_contatos USING btree (state) WHERE (is_active = true)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_state_city",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_state_city ON public.terreiros_contatos USING btree (state, city) WHERE (is_active = true)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_terreiro",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_terreiro ON public.terreiros_contatos USING btree (terreiro_id)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_trgm_address",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_trgm_address ON public.terreiros_contatos USING gin (address gin_trgm_ops)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_trgm_instagram",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_trgm_instagram ON public.terreiros_contatos USING gin (instagram_handle gin_trgm_ops)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "idx_terreiros_contatos_trgm_neighborhood",
          "indexdef": "CREATE INDEX idx_terreiros_contatos_trgm_neighborhood ON public.terreiros_contatos USING gin (neighborhood gin_trgm_ops)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "terreiros_contatos_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiros_contatos_pkey ON public.terreiros_contatos USING btree (id)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "terreiros_contatos_terreiro_id_idx",
          "indexdef": "CREATE UNIQUE INDEX terreiros_contatos_terreiro_id_idx ON public.terreiros_contatos USING btree (terreiro_id) WHERE (is_primary = true)"
        },
        {
          "tablename": "terreiros_contatos",
          "indexname": "ux_terreiros_contatos_terreiro_id",
          "indexdef": "CREATE UNIQUE INDEX ux_terreiros_contatos_terreiro_id ON public.terreiros_contatos USING btree (terreiro_id)"
        },
        {
          "tablename": "terreiros_responsaveis",
          "indexname": "idx_terreiros_responsaveis_terreiro",
          "indexdef": "CREATE INDEX idx_terreiros_responsaveis_terreiro ON public.terreiros_responsaveis USING btree (terreiro_id)"
        },
        {
          "tablename": "terreiros_responsaveis",
          "indexname": "terreiros_responsaveis_pkey",
          "indexdef": "CREATE UNIQUE INDEX terreiros_responsaveis_pkey ON public.terreiros_responsaveis USING btree (id)"
        },
        {
          "tablename": "terreiros_responsaveis",
          "indexname": "terreiros_responsaveis_terreiro_id_idx",
          "indexdef": "CREATE UNIQUE INDEX terreiros_responsaveis_terreiro_id_idx ON public.terreiros_responsaveis USING btree (terreiro_id) WHERE (is_primary = true)"
        },
        {
          "tablename": "terreiros_responsaveis",
          "indexname": "uq_terreiros_responsaveis_one_primary",
          "indexdef": "CREATE UNIQUE INDEX uq_terreiros_responsaveis_one_primary ON public.terreiros_responsaveis USING btree (terreiro_id) WHERE (is_primary = true)"
        }
      ],
      "rls_status": [
        {
          "tablename": "auth_login_attempts",
          "rls_enabled": true
        },
        {
          "tablename": "collections",
          "rls_enabled": true
        },
        {
          "tablename": "collections_pontos",
          "rls_enabled": true
        },
        {
          "tablename": "consents",
          "rls_enabled": true
        },
        {
          "tablename": "curator_invites",
          "rls_enabled": true
        },
        {
          "tablename": "curators",
          "rls_enabled": true
        },
        {
          "tablename": "dev_masters",
          "rls_enabled": true
        },
        {
          "tablename": "entidade_aliases",
          "rls_enabled": true
        },
        {
          "tablename": "entidades",
          "rls_enabled": true
        },
        {
          "tablename": "orixa_dictionary",
          "rls_enabled": true
        },
        {
          "tablename": "ponto_audios",
          "rls_enabled": true
        },
        {
          "tablename": "ponto_change_logs",
          "rls_enabled": true
        },
        {
          "tablename": "ponto_versoes",
          "rls_enabled": true
        },
        {
          "tablename": "pontos",
          "rls_enabled": true
        },
        {
          "tablename": "pontos_backup_20250329",
          "rls_enabled": false
        },
        {
          "tablename": "pontos_submissions",
          "rls_enabled": true
        },
        {
          "tablename": "profiles",
          "rls_enabled": true
        },
        {
          "tablename": "public_app_config",
          "rls_enabled": true
        },
        {
          "tablename": "terreiro_invites",
          "rls_enabled": true
        },
        {
          "tablename": "terreiro_members",
          "rls_enabled": true
        },
        {
          "tablename": "terreiro_membership_requests",
          "rls_enabled": true
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "rls_enabled": true
        },
        {
          "tablename": "terreiros",
          "rls_enabled": true
        },
        {
          "tablename": "terreiros_contatos",
          "rls_enabled": true
        },
        {
          "tablename": "terreiros_responsaveis",
          "rls_enabled": true
        }
      ],
      "rls_policies": [
        {
          "tablename": "auth_login_attempts",
          "policyname": "auth_login_attempts_delete_none",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "DELETE",
          "qual": "false",
          "with_check": null
        },
        {
          "tablename": "auth_login_attempts",
          "policyname": "auth_login_attempts_insert_anon_prelogin",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "((user_id IS NULL) AND (provider IS NOT NULL) AND (event IS NOT NULL))"
        },
        {
          "tablename": "auth_login_attempts",
          "policyname": "auth_login_attempts_insert_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(user_id = auth.uid())"
        },
        {
          "tablename": "auth_login_attempts",
          "policyname": "auth_login_attempts_select_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "auth_login_attempts",
          "policyname": "auth_login_attempts_update_none",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "UPDATE",
          "qual": "false",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "Dev masters can delete collections",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "Dev masters can insert collections",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "collections",
          "policyname": "Dev masters can select collections",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "Dev masters can update collections",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "collections",
          "policyname": "collections_delete_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "((owner_user_id = auth.uid()) OR ((owner_terreiro_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = collections.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))))",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "collections_insert_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(((owner_user_id = auth.uid()) AND (owner_terreiro_id IS NULL)) OR ((owner_terreiro_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = collections.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))))"
        },
        {
          "tablename": "collections",
          "policyname": "collections_select_owner",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(owner_user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "collections_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((visibility = 'public'::collection_visibility) AND ((owner_terreiro_id IS NULL) OR is_terreiro_admin_or_editor(owner_terreiro_id) OR collection_has_pontos(id)))",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "collections_select_terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((owner_terreiro_id IS NOT NULL) AND (visibility = 'members'::collection_visibility) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = collections.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text, 'member'::text])) AND ((tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) OR collection_has_pontos(collections.id))))))",
          "with_check": null
        },
        {
          "tablename": "collections",
          "policyname": "collections_update_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "((owner_user_id = auth.uid()) OR ((owner_terreiro_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = collections.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))))",
          "with_check": "((owner_user_id = auth.uid()) OR ((owner_terreiro_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = collections.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))))"
        },
        {
          "tablename": "collections_pontos",
          "policyname": "Dev masters can delete collections_pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "Dev masters can insert collections_pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "collections_pontos",
          "policyname": "Dev masters can select collections_pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "Dev masters can update collections_pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_delete_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM (collections c\n     LEFT JOIN terreiro_members tm ON (((tm.terreiro_id = c.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))\n  WHERE ((c.id = collections_pontos.collection_id) AND ((c.owner_user_id = auth.uid()) OR ((c.owner_terreiro_id IS NOT NULL) AND (tm.user_id IS NOT NULL))))))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_insert_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM (collections c\n     LEFT JOIN terreiro_members tm ON (((tm.terreiro_id = c.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))\n  WHERE ((c.id = collections_pontos.collection_id) AND ((c.owner_user_id = auth.uid()) OR ((c.owner_terreiro_id IS NOT NULL) AND (tm.user_id IS NOT NULL))))))"
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_select_owner",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM collections c\n  WHERE ((c.id = collections_pontos.collection_id) AND (c.owner_user_id = auth.uid()))))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM collections c\n  WHERE ((c.id = collections_pontos.collection_id) AND (c.visibility = 'public'::collection_visibility))))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_select_terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM (collections c\n     JOIN terreiro_members tm ON ((tm.terreiro_id = c.owner_terreiro_id)))\n  WHERE ((c.id = collections_pontos.collection_id) AND (c.visibility = 'members'::collection_visibility) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text, 'member'::text])))))",
          "with_check": null
        },
        {
          "tablename": "collections_pontos",
          "policyname": "collections_pontos_update_owner_or_terreiro_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM (collections c\n     LEFT JOIN terreiro_members tm ON (((tm.terreiro_id = c.owner_terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))\n  WHERE ((c.id = collections_pontos.collection_id) AND ((c.owner_user_id = auth.uid()) OR ((c.owner_terreiro_id IS NOT NULL) AND (tm.user_id IS NOT NULL))))))",
          "with_check": "true"
        },
        {
          "tablename": "consents",
          "policyname": "consents_select_all_auth",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "curator_invites",
          "policyname": "Dev masters can delete curator_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "is_dev_master()",
          "with_check": null
        },
        {
          "tablename": "curator_invites",
          "policyname": "Dev masters can insert curator_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "is_dev_master()"
        },
        {
          "tablename": "curator_invites",
          "policyname": "Dev masters can select curator_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "is_dev_master()",
          "with_check": null
        },
        {
          "tablename": "curator_invites",
          "policyname": "Dev masters can update curator_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "is_dev_master()",
          "with_check": "is_dev_master()"
        },
        {
          "tablename": "curator_invites",
          "policyname": "Select own pending curator invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((status = 'pending'::curator_invite_status) AND (now() < expires_at) AND (lower(email) = lower((auth.jwt() ->> 'email'::text))))",
          "with_check": null
        },
        {
          "tablename": "curators",
          "policyname": "Curators can read own curator row",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "curators",
          "policyname": "Dev masters can delete curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "curators",
          "policyname": "Dev masters can insert curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "curators",
          "policyname": "Dev masters can select curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "curators",
          "policyname": "Dev masters can update curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "curators",
          "policyname": "curators_select_self",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "dev_masters",
          "policyname": "Dev masters can delete dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "dev_masters",
          "policyname": "Dev masters can insert dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "dev_masters",
          "policyname": "Dev masters can read own dev master row",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "dev_masters",
          "policyname": "Dev masters can update dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "entidade_aliases",
          "policyname": "entidade_aliases_all_dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "ALL",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "entidade_aliases",
          "policyname": "entidade_aliases_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "entidades",
          "policyname": "entidades_all_dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "ALL",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "entidades",
          "policyname": "entidades_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(is_active = true)",
          "with_check": null
        },
        {
          "tablename": "orixa_dictionary",
          "policyname": "Dev masters can delete orixa_dictionary",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "orixa_dictionary",
          "policyname": "Dev masters can insert orixa_dictionary",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "orixa_dictionary",
          "policyname": "Dev masters can select orixa_dictionary",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "orixa_dictionary",
          "policyname": "Dev masters can update orixa_dictionary",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "orixa_dictionary",
          "policyname": "orixa_dictionary_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "ponto_audios",
          "policyname": "ponto_audios_delete_owner",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(created_by = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "ponto_audios",
          "policyname": "ponto_audios_insert_authenticated",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(created_by = auth.uid())"
        },
        {
          "tablename": "ponto_audios",
          "policyname": "ponto_audios_owner_read_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(created_by = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "ponto_audios",
          "policyname": "ponto_audios_public_read_active",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "SELECT",
          "qual": "((is_active = true) AND (upload_status = 'uploaded'::audio_upload_status))",
          "with_check": null
        },
        {
          "tablename": "ponto_audios",
          "policyname": "ponto_audios_update_owner",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(created_by = auth.uid())",
          "with_check": "(created_by = auth.uid())"
        },
        {
          "tablename": "ponto_change_logs",
          "policyname": "curators_can_select_ponto_change_logs",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "ponto_change_logs",
          "policyname": "dev_masters_full_access_ponto_change_logs",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "ALL",
          "qual": "((auth.jwt() ->> 'role'::text) = 'dev_master'::text)",
          "with_check": "((auth.jwt() ->> 'role'::text) = 'dev_master'::text)"
        },
        {
          "tablename": "ponto_versoes",
          "policyname": "ponto_versoes_all_dev_masters",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "ALL",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "ponto_versoes",
          "policyname": "ponto_versoes_insert_curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))"
        },
        {
          "tablename": "ponto_versoes",
          "policyname": "ponto_versoes_select_curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "ponto_versoes",
          "policyname": "ponto_versoes_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((is_active = true) AND (EXISTS ( SELECT 1\n   FROM pontos p\n  WHERE ((p.id = ponto_versoes.ponto_id) AND (p.is_active = true) AND (p.restricted = false)))))",
          "with_check": null
        },
        {
          "tablename": "ponto_versoes",
          "policyname": "ponto_versoes_update_curators",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos",
          "policyname": "Curators can delete pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "pontos",
          "policyname": "Curators can insert pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos",
          "policyname": "Curators can read all pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "pontos",
          "policyname": "Curators can update pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos",
          "policyname": "Dev masters can delete pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "pontos",
          "policyname": "Dev masters can insert pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos",
          "policyname": "Dev masters can select pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "pontos",
          "policyname": "Dev masters can update pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos",
          "policyname": "Public read pontos active",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((is_active = true) AND (restricted = false))",
          "with_check": null
        },
        {
          "tablename": "pontos",
          "policyname": "curators_can_update_pontos",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM curators c\n  WHERE (c.user_id = auth.uid())))"
        },
        {
          "tablename": "pontos_submissions",
          "policyname": "insert_audio_upload_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "((created_by = auth.uid()) AND (kind = 'audio_upload'::ponto_submission_kind))"
        },
        {
          "tablename": "pontos_submissions",
          "policyname": "pontos_submissions_insert_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(created_by = auth.uid())"
        },
        {
          "tablename": "pontos_submissions",
          "policyname": "pontos_submissions_select_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(created_by = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "profiles",
          "policyname": "Dev masters can delete profiles",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "profiles",
          "policyname": "Dev masters can insert profiles",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "profiles",
          "policyname": "Dev masters can select profiles",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "profiles",
          "policyname": "Dev masters can update profiles",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "profiles",
          "policyname": "profiles_insert_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(id = auth.uid())"
        },
        {
          "tablename": "profiles",
          "policyname": "profiles_select_all_anon",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "profiles",
          "policyname": "profiles_select_all_authenticated",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "profiles",
          "policyname": "profiles_update_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(id = auth.uid())",
          "with_check": "(id = auth.uid())"
        },
        {
          "tablename": "public_app_config",
          "policyname": "Dev masters can delete public_app_config",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "public_app_config",
          "policyname": "Dev masters can insert public_app_config",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "public_app_config",
          "policyname": "Dev masters can select public_app_config",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "public_app_config",
          "policyname": "Dev masters can update public_app_config",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "public_app_config",
          "policyname": "public_app_config_read_app_install_url",
          "permissive": "PERMISSIVE",
          "roles": [
            "anon",
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(key = 'app_install_url'::text)",
          "with_check": null
        },
        {
          "tablename": "public_app_config",
          "policyname": "public_app_config_write_service_role_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "ALL",
          "qual": "(auth.role() = 'service_role'::text)",
          "with_check": "(auth.role() = 'service_role'::text)"
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "Dev masters can delete terreiro_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "Dev masters can insert terreiro_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "Dev masters can select terreiro_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "Dev masters can update terreiro_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "invites_delete_admin",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_invites.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "invites_insert_admin",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "((created_by = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_invites.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text)))))"
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "invites_select_admin",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_invites.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "invites_update_admin",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_invites.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": "true"
        },
        {
          "tablename": "terreiro_invites",
          "policyname": "select_own_invites",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(email = lower((auth.jwt() ->> 'email'::text)))",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "Dev masters can delete terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "Dev masters can insert terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_members",
          "policyname": "Dev masters can select terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "Dev masters can update terreiro_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_members",
          "policyname": "Members can leave terreiro",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "tm_delete_admin_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "is_terreiro_admin(terreiro_id)",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "tm_insert_admin_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "is_terreiro_admin(terreiro_id)"
        },
        {
          "tablename": "terreiro_members",
          "policyname": "tm_insert_creator_as_admin",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "((user_id = auth.uid()) AND (role = 'admin'::text) AND is_terreiro_creator(terreiro_id) AND (COALESCE(status, 'active'::text) = 'active'::text))"
        },
        {
          "tablename": "terreiro_members",
          "policyname": "tm_select_visible",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "((user_id = auth.uid()) OR is_terreiro_member(terreiro_id))",
          "with_check": null
        },
        {
          "tablename": "terreiro_members",
          "policyname": "tm_update_admin_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "is_terreiro_admin(terreiro_id)",
          "with_check": "true"
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "Dev masters can delete terreiro_membership_requests",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "Dev masters can insert terreiro_membership_requests",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "Dev masters can select terreiro_membership_requests",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "Dev masters can update terreiro_membership_requests",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "tmr_insert_own_pending",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "((user_id = auth.uid()) AND (status = 'pending'::terreiro_membership_request_status) AND (NOT (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_membership_requests.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))))"
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "tmr_select_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_membership_requests.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))",
          "with_check": null
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "tmr_select_own",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "with_check": null
        },
        {
          "tablename": "terreiro_membership_requests",
          "policyname": "tmr_update_admin_editor_review_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_membership_requests.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])))))",
          "with_check": "((terreiro_id = ( SELECT r.terreiro_id\n   FROM terreiro_membership_requests r\n  WHERE (r.id = terreiro_membership_requests.id))) AND (user_id = ( SELECT r.user_id\n   FROM terreiro_membership_requests r\n  WHERE (r.id = terreiro_membership_requests.id))) AND (created_at = ( SELECT r.created_at\n   FROM terreiro_membership_requests r\n  WHERE (r.id = terreiro_membership_requests.id))))"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "Dev masters can delete terreiro_ponto_custom_tags",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "Dev masters can insert terreiro_ponto_custom_tags",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "Dev masters can select terreiro_ponto_custom_tags",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "Dev masters can update terreiro_ponto_custom_tags",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "tpc_delete_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "tpc_insert_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))"
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "tpc_select_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id) AND (tm.user_id = auth.uid()) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiro_ponto_custom_tags",
          "policyname": "tpc_update_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiro_ponto_custom_tags.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))"
        },
        {
          "tablename": "terreiros",
          "policyname": "Dev masters can delete terreiros",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros",
          "policyname": "Dev masters can insert terreiros",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros",
          "policyname": "Dev masters can select terreiros",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros",
          "policyname": "Dev masters can update terreiros",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros",
          "policyname": "terreiros_insert_authenticated",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(created_by = auth.uid())"
        },
        {
          "tablename": "terreiros",
          "policyname": "terreiros_select_all",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "SELECT",
          "qual": "true",
          "with_check": null
        },
        {
          "tablename": "terreiros",
          "policyname": "terreiros_update_admin_only",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "((created_by = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros.id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text)))))",
          "with_check": "((created_by = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros.id) AND (tm.user_id = auth.uid()) AND (tm.role = 'admin'::text) AND (COALESCE(tm.status, 'active'::text) = 'active'::text)))))"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "Dev masters can delete terreiros_contatos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "Dev masters can insert terreiros_contatos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "Dev masters can select terreiros_contatos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "Dev masters can update terreiros_contatos",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "tc_insert_can_edit",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "can_edit_terreiro(terreiro_id)"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "tc_insert_creator",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM terreiros t\n  WHERE ((t.id = terreiros_contatos.terreiro_id) AND (t.created_by = auth.uid()))))"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "tc_update_can_edit",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "can_edit_terreiro(terreiro_id)",
          "with_check": "can_edit_terreiro(terreiro_id)"
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "terreiros_contatos_delete_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "is_terreiro_admin_or_editor(terreiro_id)",
          "with_check": null
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "terreiros_contatos_select_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_contatos.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiros_contatos",
          "policyname": "terreiros_contatos_select_public",
          "permissive": "PERMISSIVE",
          "roles": [
            "public"
          ],
          "cmd": "SELECT",
          "qual": "(is_active = true)",
          "with_check": null
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "Dev masters can delete terreiros_responsaveis",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "Dev masters can insert terreiros_responsaveis",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "Dev masters can select terreiros_responsaveis",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": null
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "Dev masters can update terreiros_responsaveis",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM dev_masters dm\n  WHERE (dm.user_id = auth.uid())))"
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "terreiros_responsaveis_delete_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "DELETE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_responsaveis.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "terreiros_responsaveis_insert_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "INSERT",
          "qual": null,
          "with_check": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_responsaveis.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))"
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "terreiros_responsaveis_select_members",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "SELECT",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_responsaveis.terreiro_id) AND (tm.user_id = auth.uid()) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": null
        },
        {
          "tablename": "terreiros_responsaveis",
          "policyname": "terreiros_responsaveis_update_admin_editor",
          "permissive": "PERMISSIVE",
          "roles": [
            "authenticated"
          ],
          "cmd": "UPDATE",
          "qual": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_responsaveis.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))",
          "with_check": "(EXISTS ( SELECT 1\n   FROM terreiro_members tm\n  WHERE ((tm.terreiro_id = terreiros_responsaveis.terreiro_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'curimba'::text, 'editor'::text])) AND (COALESCE(tm.status, 'active'::text) = 'active'::text))))"
        }
      ],
      "functions": [
        {
          "routine_name": "_extract_avatar_from_auth_meta",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": "\r\n  select coalesce(\r\n    nullif(meta->>'avatar_url', ''),\r\n    nullif(meta->>'picture', '')\r\n  );\r\n"
        },
        {
          "routine_name": "_extract_full_name_from_auth_meta",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": "\r\n  select coalesce(\r\n    nullif(meta->>'full_name', ''),\r\n    nullif(meta->>'name', ''),\r\n    nullif(meta->>'preferred_username', ''),\r\n    case\r\n      when fallback_email is null then null\r\n      else split_part(fallback_email, '@', 1)\r\n    end\r\n  );\r\n"
        },
        {
          "routine_name": "accept_curator_invite",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_ok int;\r\nbegin\r\n  v_email := lower((auth.jwt() ->> 'email'));\r\n\r\n  if v_email is null or v_email = '' then\r\n    raise exception 'missing_email_claim';\r\n  end if;\r\n\r\n  -- Atualiza convite somente se for o email da pessoa e estiver pendente e não expirado\r\n  update public.curator_invites\r\n     set status = 'accepted',\r\n         accepted_by = auth.uid(),\r\n         responded_at = now()\r\n   where id = p_invite_id\r\n     and status = 'pending'\r\n     and now() < expires_at\r\n     and lower(email) = v_email\r\n  returning 1 into v_ok;\r\n\r\n  if coalesce(v_ok, 0) <> 1 then\r\n    return false;\r\n  end if;\r\n\r\n  -- Garante papel curator\r\n  insert into public.curators (user_id)\r\n  values (auth.uid())\r\n  on conflict (user_id) do nothing;\r\n\r\n  return true;\r\nend;\r\n"
        },
        {
          "routine_name": "accept_terreiro_invite",
          "routine_type": "FUNCTION",
          "return_type": "USER-DEFINED",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_inv public.terreiro_invites;\r\nbegin\r\n  v_email := lower(auth.jwt() ->> 'email');\r\n\r\n  if v_email is null or length(trim(v_email)) = 0 then\r\n    raise exception 'missing_auth_email';\r\n  end if;\r\n\r\n  select *\r\n    into v_inv\r\n  from public.terreiro_invites ti\r\n  where ti.id = p_invite_id\r\n    and ti.status = 'pending'\r\n    and lower(ti.email) = v_email\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'invite_not_found_or_not_pending';\r\n  end if;\r\n\r\n  update public.terreiro_invites\r\n     set status = 'accepted',\r\n         activated_at = now(),\r\n         activated_by = auth.uid()\r\n   where id = p_invite_id\r\n   returning * into v_inv;\r\n\r\n  insert into public.terreiro_members (\r\n    terreiro_id,\r\n    user_id,\r\n    role,\r\n    created_at\r\n  )\r\n  values (\r\n    v_inv.terreiro_id,\r\n    auth.uid(),\r\n    v_inv.role,\r\n    now()\r\n  )\r\n  on conflict (terreiro_id, user_id)\r\n  do update set\r\n    role = excluded.role;\r\n\r\n  return v_inv;\r\nend;\r\n"
        },
        {
          "routine_name": "approve_audio_upload_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\nDECLARE\r\n  v_is_curator boolean;\r\n  s             public.pontos_submissions%rowtype;\r\n  a             public.ponto_audios%rowtype;\r\n  v_versao      public.ponto_versoes%rowtype;\r\nBEGIN\r\n  -- 1) Permissão\r\n  SELECT EXISTS (\r\n    SELECT 1 FROM public.curators c WHERE c.user_id = auth.uid()\r\n  ) INTO v_is_curator;\r\n\r\n  IF NOT v_is_curator THEN\r\n    RAISE EXCEPTION 'not_allowed: only curators can approve audio submissions';\r\n  END IF;\r\n\r\n  -- 2) Lock submission\r\n  SELECT * INTO s\r\n  FROM public.pontos_submissions\r\n  WHERE id = p_submission_id\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN\r\n    RAISE EXCEPTION 'not_found: submission %', p_submission_id;\r\n  END IF;\r\n\r\n  IF s.status <> 'pending' THEN\r\n    RAISE EXCEPTION 'invalid_status: submission % is % (expected pending)', p_submission_id, s.status;\r\n  END IF;\r\n\r\n  IF s.kind <> 'audio_upload' THEN\r\n    RAISE EXCEPTION 'invalid_kind: submission % is % (expected audio_upload)', p_submission_id, s.kind;\r\n  END IF;\r\n\r\n  IF s.ponto_versao_id IS NULL THEN\r\n    RAISE EXCEPTION 'invalid_submission: audio_upload requires ponto_versao_id';\r\n  END IF;\r\n\r\n  IF s.ponto_audio_id IS NULL THEN\r\n    RAISE EXCEPTION 'invalid_submission: audio_upload requires ponto_audio_id';\r\n  END IF;\r\n\r\n  -- 3) Validar versão\r\n  SELECT * INTO v_versao\r\n  FROM public.ponto_versoes\r\n  WHERE id = s.ponto_versao_id\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN\r\n    RAISE EXCEPTION 'not_found: ponto_versao %', s.ponto_versao_id;\r\n  END IF;\r\n\r\n  IF NOT v_versao.is_active THEN\r\n    RAISE EXCEPTION 'invalid_versao: ponto_versao % is not active', s.ponto_versao_id;\r\n  END IF;\r\n\r\n  -- 4) Lock áudio\r\n  SELECT * INTO a\r\n  FROM public.ponto_audios\r\n  WHERE id = s.ponto_audio_id\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN\r\n    RAISE EXCEPTION 'not_found: ponto_audio %', s.ponto_audio_id;\r\n  END IF;\r\n\r\n  IF a.upload_status <> 'uploaded' THEN\r\n    RAISE EXCEPTION 'invalid_audio_state: ponto_audio % is % (expected uploaded)', a.id, a.upload_status;\r\n  END IF;\r\n\r\n  -- 5) Aprovar submission primeiro (guard do trigger precisa ver status=approved)\r\n  UPDATE public.pontos_submissions\r\n    SET status      = 'approved',\r\n        reviewed_by = auth.uid(),\r\n        reviewed_at = now()\r\n  WHERE id = s.id;\r\n\r\n  -- 6) Desativar outros áudios da mesma versão\r\n  UPDATE public.ponto_audios\r\n    SET is_active = false\r\n  WHERE ponto_versao_id = s.ponto_versao_id\r\n    AND id <> a.id;\r\n\r\n  -- 7) Vincular e ativar o áudio na versão\r\n  UPDATE public.ponto_audios\r\n    SET ponto_versao_id = s.ponto_versao_id,\r\n        ponto_id        = NULL,\r\n        is_active       = true,\r\n        updated_at      = now()\r\n  WHERE id = a.id;\r\n\r\n  RETURN jsonb_build_object(\r\n    'ok',              true,\r\n    'submission_id',   s.id,\r\n    'decision',        'approved',\r\n    'ponto_id',        v_versao.ponto_id,\r\n    'ponto_versao_id', s.ponto_versao_id,\r\n    'ponto_audio_id',  s.ponto_audio_id\r\n  );\r\nEND;\r\n"
        },
        {
          "routine_name": "approve_ponto_correction_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_is_curator boolean;\r\n  s public.pontos_submissions%rowtype;\r\n  p_before public.pontos%rowtype;\r\n  p_after public.pontos%rowtype;\r\n  j_before jsonb;\r\n  j_after jsonb;\r\nbegin\r\n  -- 1) Permissão: só curadoras\r\n  select exists (\r\n    select 1\r\n    from public.curators c\r\n    where c.user_id = auth.uid()\r\n  ) into v_is_curator;\r\n\r\n  if not v_is_curator then\r\n    raise exception 'not_allowed: only curators can approve submissions';\r\n  end if;\r\n\r\n  -- 2) Lock da submission\r\n  select *\r\n  into s\r\n  from public.pontos_submissions\r\n  where id = p_submission_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'not_found: submission %', p_submission_id;\r\n  end if;\r\n\r\n  if s.status <> 'pending' then\r\n    raise exception 'invalid_status: submission % is % (expected pending)', p_submission_id, s.status;\r\n  end if;\r\n\r\n  if s.kind <> 'correction' then\r\n    raise exception 'invalid_kind: submission % is % (expected correction)', p_submission_id, s.kind;\r\n  end if;\r\n\r\n  if s.target_ponto_id is null then\r\n    raise exception 'invalid_submission: correction requires target_ponto_id';\r\n  end if;\r\n\r\n  -- 3) Lock do ponto alvo\r\n  select *\r\n  into p_before\r\n  from public.pontos\r\n  where id = s.target_ponto_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'not_found: target ponto %', s.target_ponto_id;\r\n  end if;\r\n\r\n  j_before := to_jsonb(p_before);\r\n\r\n  -- 4) Aplica correção no ponto (campos espelhados da submission)\r\n  update public.pontos\r\n  set\r\n    title              = s.title,\r\n    lyrics             = s.lyrics,\r\n    tags               = s.tags,\r\n    artist             = s.artist,\r\n    author_name        = s.author_name,\r\n    interpreter_name   = s.interpreter_name,\r\n    author_contact     = s.author_contact,\r\n    has_author_consent = s.has_author_consent,\r\n\r\n    -- trilha de curadoria (seu schema exige curated_by quando source_submission_id != null)\r\n    curated_by         = auth.uid(),\r\n    source_submission_id = s.id\r\n  where id = p_before.id\r\n  returning * into p_after;\r\n\r\n  j_after := to_jsonb(p_after);\r\n\r\n  -- 5) Log de mudança\r\n  insert into public.ponto_change_logs (\r\n    ponto_id,\r\n    action,\r\n    changed_by,\r\n    before,\r\n    after\r\n  )\r\n  values (\r\n    p_after.id,\r\n    'UPDATE',\r\n    auth.uid(),\r\n    j_before,\r\n    j_after\r\n  );\r\n\r\n  -- 6) Marca submission como aprovada\r\n  update public.pontos_submissions\r\n  set\r\n    status          = 'approved',\r\n    reviewed_by     = auth.uid(),\r\n    reviewed_at     = now(),\r\n    review_note     = p_review_note,\r\n    approved_ponto_id = p_after.id\r\n  where id = s.id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'submission_id', s.id,\r\n    'ponto_id', p_after.id,\r\n    'action', 'UPDATE'\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "approve_ponto_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\nDECLARE\r\n  v_is_curator        boolean;\r\n  v_sub               record;\r\n  v_ponto_id          uuid;\r\n  v_versao_id         uuid;\r\n  v_title             text;\r\n  v_lyrics            text;\r\n  v_tags              text[];\r\n  v_author_name       text;\r\n  v_interpreter_name  text;\r\n  v_has_author_consent boolean;\r\nBEGIN\r\n  -- 1) Permissão\r\n  SELECT EXISTS (SELECT 1 FROM public.curators c WHERE c.user_id = auth.uid())\r\n    INTO v_is_curator;\r\n\r\n  IF NOT v_is_curator THEN\r\n    RAISE EXCEPTION 'not_curator';\r\n  END IF;\r\n\r\n  -- 2) Lock submission\r\n  SELECT * INTO v_sub\r\n  FROM public.pontos_submissions\r\n  WHERE id = p_submission_id\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN RAISE EXCEPTION 'submission_not_found'; END IF;\r\n  IF v_sub.status <> 'pending' THEN RAISE EXCEPTION 'submission_not_pending'; END IF;\r\n  IF v_sub.kind <> 'new' THEN RAISE EXCEPTION 'invalid_kind: expected new, got %', v_sub.kind; END IF;\r\n  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;\r\n\r\n  -- 3) Rejeição\r\n  IF p_decision = 'rejected' THEN\r\n    UPDATE public.pontos_submissions\r\n      SET status       = 'rejected',\r\n          reviewed_at  = now(),\r\n          reviewed_by  = auth.uid(),\r\n          review_note  = p_review_note,\r\n          ponto_id     = NULL\r\n    WHERE id = p_submission_id;\r\n\r\n    IF v_sub.ponto_audio_id IS NOT NULL THEN\r\n      UPDATE public.ponto_audios\r\n        SET is_active = false\r\n      WHERE id = v_sub.ponto_audio_id;\r\n    END IF;\r\n\r\n    RETURN jsonb_build_object('decision', 'rejected', 'submission_id', p_submission_id);\r\n  END IF;\r\n\r\n  -- 4) Resolução de campos\r\n  v_title  := COALESCE(p_title,  NULLIF(BTRIM(v_sub.payload->>'title'),  ''));\r\n  v_lyrics := COALESCE(p_lyrics, NULLIF(BTRIM(v_sub.payload->>'lyrics'), ''));\r\n\r\n  v_tags := COALESCE(\r\n    p_tags,\r\n    CASE\r\n      WHEN jsonb_typeof(v_sub.payload->'tags') = 'array'\r\n        THEN ARRAY(SELECT jsonb_array_elements_text(v_sub.payload->'tags'))\r\n      ELSE NULL\r\n    END\r\n  );\r\n\r\n  v_author_name      := COALESCE(p_author_name, v_sub.author_name,\r\n                          NULLIF(BTRIM(v_sub.payload->>'author_name'), ''));\r\n  v_interpreter_name := COALESCE(p_interpreter_name, v_sub.interpreter_name,\r\n                          NULLIF(BTRIM(v_sub.payload->>'interpreter_name'), ''));\r\n  v_has_author_consent := COALESCE(p_has_author_consent, v_sub.author_consent_granted);\r\n\r\n  IF v_title IS NULL THEN RAISE EXCEPTION 'missing_title'; END IF;\r\n  IF v_lyrics IS NULL THEN RAISE EXCEPTION 'missing_lyrics'; END IF;\r\n\r\n  IF v_author_name IS NOT NULL AND BTRIM(v_author_name) <> ''\r\n     AND v_interpreter_name IS NOT NULL AND BTRIM(v_interpreter_name) <> ''\r\n     AND LOWER(BTRIM(v_author_name)) <> LOWER(BTRIM(v_interpreter_name)) THEN\r\n    IF v_has_author_consent IS DISTINCT FROM true THEN\r\n      RAISE EXCEPTION 'missing_author_consent';\r\n    END IF;\r\n  END IF;\r\n\r\n  -- 5) Criar ponto agregador\r\n  INSERT INTO public.pontos (\r\n    title,\r\n    tags,\r\n    is_active,\r\n    restricted,\r\n    is_public_domain,\r\n    author_name,\r\n    created_by,\r\n    curated_by\r\n  )\r\n  VALUES (\r\n    v_title,\r\n    COALESCE(v_tags, '{}'),\r\n    true,\r\n    false,\r\n    v_sub.ponto_is_public_domain,\r\n    NULLIF(BTRIM(COALESCE(v_author_name, '')), ''),\r\n    v_sub.created_by,\r\n    auth.uid()\r\n  )\r\n  RETURNING id INTO v_ponto_id;\r\n\r\n  -- 6) Criar versão canônica\r\n  INSERT INTO public.ponto_versoes (\r\n    ponto_id,\r\n    versao_num,\r\n    is_canonical,\r\n    title,\r\n    lyrics,\r\n    tags,\r\n    author_name,\r\n    is_public_domain,\r\n    source_submission_id,\r\n    created_by,\r\n    curated_by,\r\n    is_active\r\n  )\r\n  VALUES (\r\n    v_ponto_id,\r\n    1,\r\n    true,\r\n    NULL,  -- herda título do ponto\r\n    v_lyrics,\r\n    '{}',  -- tags adicionais da versão começam vazias\r\n    NULL,  -- herda author_name do ponto\r\n    NULL,  -- herda is_public_domain do ponto\r\n    p_submission_id,\r\n    v_sub.created_by,\r\n    auth.uid(),\r\n    true\r\n  )\r\n  RETURNING id INTO v_versao_id;\r\n\r\n  -- 7) Aprovar submission e vincular ao ponto e versão\r\n  UPDATE public.pontos_submissions\r\n    SET status                = 'approved',\r\n        reviewed_at           = now(),\r\n        reviewed_by           = auth.uid(),\r\n        review_note           = p_review_note,\r\n        ponto_id              = v_ponto_id,\r\n        ponto_versao_id       = v_versao_id,\r\n        author_name           = NULLIF(BTRIM(COALESCE(v_author_name, '')), ''),\r\n        interpreter_name      = NULLIF(BTRIM(COALESCE(v_interpreter_name, '')), ''),\r\n        author_consent_granted = v_has_author_consent\r\n  WHERE id = p_submission_id;\r\n\r\n  -- 8) Vincular e ativar áudio na versão (se houver)\r\n  IF v_sub.ponto_audio_id IS NOT NULL THEN\r\n    UPDATE public.ponto_audios\r\n      SET ponto_versao_id = v_versao_id,\r\n          ponto_id        = NULL,\r\n          is_active       = true,\r\n          updated_at      = now()\r\n    WHERE id = v_sub.ponto_audio_id;\r\n  END IF;\r\n\r\n  RETURN jsonb_build_object(\r\n    'decision',        'approved',\r\n    'submission_id',   p_submission_id,\r\n    'ponto_id',        v_ponto_id,\r\n    'ponto_versao_id', v_versao_id\r\n  );\r\nEND;\r\n"
        },
        {
          "routine_name": "approve_terreiro_membership_request",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_req record;\r\n  v_is_admin boolean;\r\nbegin\r\n  -- 1) Carregar pedido\r\n  select *\r\n    into v_req\r\n  from public.terreiro_membership_requests\r\n  where id = request_id;\r\n\r\n  if not found then\r\n    raise exception 'membership_request_not_found';\r\n  end if;\r\n\r\n  if v_req.status <> 'pending' then\r\n    raise exception 'membership_request_not_pending';\r\n  end if;\r\n\r\n  -- 2) Checar admin do terreiro\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = v_req.terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role = 'admin'\r\n      and tm.status = 'active'\r\n  )\r\n  into v_is_admin;\r\n\r\n  if not v_is_admin then\r\n    raise exception 'not_authorized_admin_only';\r\n  end if;\r\n\r\n  -- 3) Marcar request como approved\r\n  update public.terreiro_membership_requests\r\n  set\r\n    status = 'approved',\r\n    reviewed_at = now(),\r\n    reviewed_by = auth.uid(),\r\n    review_note = null\r\n  where id = request_id;\r\n\r\n  -- 4) Garantir membership ativa como member (sem duplicar)\r\n  insert into public.terreiro_members (\r\n    terreiro_id,\r\n    user_id,\r\n    role,\r\n    status,\r\n    created_at\r\n  )\r\n  values (\r\n    v_req.terreiro_id,\r\n    v_req.user_id,\r\n    'member',\r\n    'active',\r\n    now()\r\n  )\r\n  on conflict (terreiro_id, user_id) do update\r\n  set\r\n    role = 'member',\r\n    status = 'active';\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'request_id', v_req.id,\r\n    'status', 'approved',\r\n    'terreiro_id', v_req.terreiro_id,\r\n    'user_id', v_req.user_id\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "approve_variation_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\nDECLARE\r\n  v_is_curator  boolean;\r\n  v_sub         record;\r\n  v_versao_id   uuid;\r\n  v_versao_num  integer;\r\n  v_title       text;\r\n  v_lyrics      text;\r\n  v_tags        text[];\r\n  v_author_name text;\r\nBEGIN\r\n  -- 1) Permissão\r\n  SELECT EXISTS (SELECT 1 FROM public.curators c WHERE c.user_id = auth.uid())\r\n    INTO v_is_curator;\r\n\r\n  IF NOT v_is_curator THEN\r\n    RAISE EXCEPTION 'not_curator';\r\n  END IF;\r\n\r\n  -- 2) Lock submission\r\n  SELECT * INTO v_sub\r\n  FROM public.pontos_submissions\r\n  WHERE id = p_submission_id\r\n  FOR UPDATE;\r\n\r\n  IF NOT FOUND THEN RAISE EXCEPTION 'submission_not_found'; END IF;\r\n  IF v_sub.status <> 'pending' THEN RAISE EXCEPTION 'submission_not_pending'; END IF;\r\n  IF v_sub.kind <> 'variation' THEN\r\n    RAISE EXCEPTION 'invalid_kind: expected variation, got %', v_sub.kind;\r\n  END IF;\r\n  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;\r\n\r\n  -- 3) ponto_id obrigatório para variação\r\n  IF v_sub.ponto_id IS NULL THEN\r\n    RAISE EXCEPTION 'invalid_submission: variation requires ponto_id';\r\n  END IF;\r\n\r\n  -- 4) Rejeição\r\n  IF p_decision = 'rejected' THEN\r\n    UPDATE public.pontos_submissions\r\n      SET status      = 'rejected',\r\n          reviewed_at = now(),\r\n          reviewed_by = auth.uid(),\r\n          review_note = p_review_note\r\n    WHERE id = p_submission_id;\r\n\r\n    IF v_sub.ponto_audio_id IS NOT NULL THEN\r\n      UPDATE public.ponto_audios\r\n        SET is_active = false\r\n      WHERE id = v_sub.ponto_audio_id;\r\n    END IF;\r\n\r\n    RETURN jsonb_build_object('decision', 'rejected', 'submission_id', p_submission_id);\r\n  END IF;\r\n\r\n  -- 5) Resolução de campos\r\n  v_title  := COALESCE(p_title,  NULLIF(BTRIM(v_sub.payload->>'title'),  ''));\r\n  v_lyrics := COALESCE(p_lyrics, NULLIF(BTRIM(v_sub.payload->>'lyrics'), ''));\r\n  v_tags   := COALESCE(\r\n    p_tags,\r\n    CASE\r\n      WHEN jsonb_typeof(v_sub.payload->'tags') = 'array'\r\n        THEN ARRAY(SELECT jsonb_array_elements_text(v_sub.payload->'tags'))\r\n      ELSE NULL\r\n    END\r\n  );\r\n  v_author_name := COALESCE(p_author_name, v_sub.author_name,\r\n                    NULLIF(BTRIM(v_sub.payload->>'author_name'), ''));\r\n\r\n  IF v_lyrics IS NULL THEN RAISE EXCEPTION 'missing_lyrics'; END IF;\r\n\r\n  -- 6) Se esta versão será canônica, descanonizar a atual\r\n  IF p_is_canonical THEN\r\n    UPDATE public.ponto_versoes\r\n      SET is_canonical = false,\r\n          updated_at   = now()\r\n    WHERE ponto_id = v_sub.ponto_id\r\n      AND is_canonical = true;\r\n  END IF;\r\n\r\n  -- 7) Calcular próximo versao_num\r\n  SELECT COALESCE(MAX(versao_num), 0) + 1\r\n    INTO v_versao_num\r\n  FROM public.ponto_versoes\r\n  WHERE ponto_id = v_sub.ponto_id;\r\n\r\n  -- 8) Criar nova versão\r\n  INSERT INTO public.ponto_versoes (\r\n    ponto_id,\r\n    versao_num,\r\n    is_canonical,\r\n    title,\r\n    lyrics,\r\n    tags,\r\n    author_name,\r\n    is_public_domain,\r\n    source_submission_id,\r\n    created_by,\r\n    curated_by,\r\n    is_active\r\n  )\r\n  VALUES (\r\n    v_sub.ponto_id,\r\n    v_versao_num,\r\n    p_is_canonical,\r\n    NULLIF(BTRIM(COALESCE(v_title, '')), ''),\r\n    v_lyrics,\r\n    COALESCE(v_tags, '{}'),\r\n    NULLIF(BTRIM(COALESCE(v_author_name, '')), ''),\r\n    NULL,  -- herda is_public_domain do ponto\r\n    p_submission_id,\r\n    v_sub.created_by,\r\n    auth.uid(),\r\n    true\r\n  )\r\n  RETURNING id INTO v_versao_id;\r\n\r\n  -- 9) Aprovar submission e vincular à versão criada\r\n  UPDATE public.pontos_submissions\r\n    SET status          = 'approved',\r\n        reviewed_at     = now(),\r\n        reviewed_by     = auth.uid(),\r\n        review_note     = p_review_note,\r\n        ponto_versao_id = v_versao_id\r\n  WHERE id = p_submission_id;\r\n\r\n  -- 10) Vincular e ativar áudio na versão (se houver)\r\n  IF v_sub.ponto_audio_id IS NOT NULL THEN\r\n    UPDATE public.ponto_audios\r\n      SET is_active       = false\r\n    WHERE ponto_versao_id = v_versao_id\r\n      AND id <> v_sub.ponto_audio_id;\r\n\r\n    UPDATE public.ponto_audios\r\n      SET ponto_versao_id = v_versao_id,\r\n          ponto_id        = NULL,\r\n          is_active       = true,\r\n          updated_at      = now()\r\n    WHERE id = v_sub.ponto_audio_id;\r\n  END IF;\r\n\r\n  RETURN jsonb_build_object(\r\n    'decision',        'approved',\r\n    'submission_id',   p_submission_id,\r\n    'ponto_id',        v_sub.ponto_id,\r\n    'ponto_versao_id', v_versao_id,\r\n    'versao_num',      v_versao_num,\r\n    'is_canonical',    p_is_canonical\r\n  );\r\nEND;\r\n"
        },
        {
          "routine_name": "block_delete_public_app_config",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  raise exception\r\n    'DELETE não permitido em public.public_app_config. Atualize apenas o campo value.';\r\nend;\r\n"
        },
        {
          "routine_name": "can_edit_terreiro",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role in ('admin', 'editor')\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  );\r\n"
        },
        {
          "routine_name": "can_manage_terreiro",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = tid\r\n      and tm.user_id = auth.uid()\r\n      and tm.role in ('admin','editor')\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  );\r\n"
        },
        {
          "routine_name": "cancel_curator_invite",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\ndeclare\r\n  v_updated int;\r\nbegin\r\n  if not public.is_dev_master() then\r\n    raise exception 'not_dev_master';\r\n  end if;\r\n\r\n  update public.curator_invites\r\n     set status = 'cancelled',\r\n         responded_at = now()\r\n   where id = p_invite_id\r\n     and status = 'pending'\r\n  returning 1 into v_updated;\r\n\r\n  return coalesce(v_updated, 0) = 1;\r\nend;\r\n"
        },
        {
          "routine_name": "claim_terreiro_invites",
          "routine_type": "FUNCTION",
          "return_type": "void",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\nbegin\r\n  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));\r\n  if v_email = '' then\r\n    return;\r\n  end if;\r\n\r\n  insert into public.terreiro_members (terreiro_id, user_id, role)\r\n  select i.terreiro_id, auth.uid(), i.role\r\n  from public.terreiro_invites i\r\n  where lower(i.email) = v_email\r\n    and i.status = 'invited'\r\n  on conflict on constraint terreiro_members_pkey\r\n  do update set role =\r\n    case\r\n      when public.terreiro_members.role = 'admin' then 'admin'\r\n      when excluded.role = 'admin' then 'admin'\r\n      else excluded.role\r\n    end;\r\n\r\n  update public.terreiro_invites i\r\n  set status = 'active',\r\n      activated_at = now(),\r\n      activated_by = auth.uid()\r\n  where lower(i.email) = v_email\r\n    and i.status = 'invited';\r\nend;\r\n"
        },
        {
          "routine_name": "cleanup_my_audio_upload_tests",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_uid uuid := auth.uid();\r\n  v_deleted_submissions int := 0;\r\n  v_deleted_audios int := 0;\r\n  v_orphan_paths jsonb := '[]'::jsonb;\r\nbegin\r\n  if v_uid is null then\r\n    raise exception 'Unauthorized';\r\n  end if;\r\n\r\n  -- 1) deletar submissions de teste (somente do usuário)\r\n  with d as (\r\n    delete from public.pontos_submissions ps\r\n    where ps.kind = 'audio_upload'::public.ponto_submission_kind\r\n      and ps.created_by = v_uid\r\n      and ps.ponto_id = p_ponto_id\r\n    returning ps.id\r\n  )\r\n  select count(*) into v_deleted_submissions from d;\r\n\r\n  -- 2) capturar paths que podem ficar órfãos (áudios pendentes desse usuário nesse ponto)\r\n  select coalesce(jsonb_agg(pa.storage_path), '[]'::jsonb)\r\n  into v_orphan_paths\r\n  from public.ponto_audios pa\r\n  where pa.created_by = v_uid\r\n    and pa.ponto_id = p_ponto_id\r\n    and (\r\n      p_delete_uploaded = true\r\n      or pa.upload_status is distinct from 'uploaded'\r\n    );\r\n\r\n  -- 3) deletar ponto_audios (por padrão só os que NÃO estão uploaded)\r\n  with d as (\r\n    delete from public.ponto_audios pa\r\n    where pa.created_by = v_uid\r\n      and pa.ponto_id = p_ponto_id\r\n      and (\r\n        p_delete_uploaded = true\r\n        or pa.upload_status is distinct from 'uploaded'\r\n      )\r\n    returning pa.id\r\n  )\r\n  select count(*) into v_deleted_audios from d;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'deleted_submissions', v_deleted_submissions,\r\n    'deleted_audios', v_deleted_audios,\r\n    'orphan_storage_paths', v_orphan_paths\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "collection_has_pontos",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.collections_pontos cp\r\n    where cp.collection_id = p_collection_id\r\n  );\r\n"
        },
        {
          "routine_name": "collections_pontos_set_defaults",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  next_pos integer;\r\nbegin\r\n  -- Garantir que exista usuário autenticado\r\n  if auth.uid() is null then\r\n    raise exception 'Not authenticated (auth.uid() is null)';\r\n  end if;\r\n\r\n  -- Preencher added_by automaticamente\r\n  if new.added_by is null then\r\n    new.added_by := auth.uid();\r\n  end if;\r\n\r\n  -- Calcular position automaticamente se não vier no insert\r\n  if new.position is null then\r\n    -- Lock por collection_id para evitar race condition\r\n    perform pg_advisory_xact_lock(\r\n      hashtextextended(new.collection_id::text, 0)\r\n    );\r\n\r\n    select coalesce(max(cp.position), 0) + 1\r\n      into next_pos\r\n    from public.collections_pontos cp\r\n    where cp.collection_id = new.collection_id;\r\n\r\n    new.position := next_pos;\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "create_curator_invite",
          "routine_type": "FUNCTION",
          "return_type": "uuid",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_id uuid;\r\nbegin\r\n  if not public.is_dev_master() then\r\n    raise exception 'not_dev_master';\r\n  end if;\r\n\r\n  v_email := lower(trim(p_email));\r\n  if v_email is null or v_email = '' then\r\n    raise exception 'invalid_email';\r\n  end if;\r\n\r\n  -- Regras: não permitir duplicidade de pending\r\n  if exists (\r\n    select 1\r\n    from public.curator_invites ci\r\n    where lower(ci.email) = v_email\r\n      and ci.status = 'pending'\r\n      and now() < ci.expires_at\r\n  ) then\r\n    raise exception 'invite_already_pending';\r\n  end if;\r\n\r\n  insert into public.curator_invites (email, created_by)\r\n  values (v_email, auth.uid())\r\n  returning id into v_id;\r\n\r\n  return v_id;\r\nend;\r\n"
        },
        {
          "routine_name": "decline_terreiro_invite",
          "routine_type": "FUNCTION",
          "return_type": "USER-DEFINED",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_inv public.terreiro_invites;\r\nbegin\r\n  v_email := lower(auth.jwt() ->> 'email');\r\n\r\n  if v_email is null or length(trim(v_email)) = 0 then\r\n    raise exception 'missing_auth_email';\r\n  end if;\r\n\r\n  select *\r\n    into v_inv\r\n  from public.terreiro_invites ti\r\n  where ti.id = p_invite_id\r\n    and ti.status = 'pending'\r\n    and lower(ti.email) = v_email\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'invite_not_found_or_not_pending';\r\n  end if;\r\n\r\n  update public.terreiro_invites\r\n     set status = 'declined',\r\n         activated_at = null,\r\n         activated_by = null\r\n   where id = p_invite_id\r\n   returning * into v_inv;\r\n\r\n  return v_inv;\r\nend;\r\n"
        },
        {
          "routine_name": "delete_collection",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_terreiro_id uuid;\r\n  v_title text;\r\n  v_can_manage boolean;\r\n  v_counts jsonb;\r\nbegin\r\n  -- 1) Carregar collection e validar existência\r\n  select c.owner_terreiro_id, c.title\r\n    into v_terreiro_id, v_title\r\n  from public.collections c\r\n  where c.id = p_collection_id;\r\n\r\n  if v_terreiro_id is null then\r\n    return jsonb_build_object(\r\n      'ok', false,\r\n      'error', 'collection_not_found',\r\n      'collection_id', p_collection_id\r\n    );\r\n  end if;\r\n\r\n  -- 2) Autorização (admin ou editor do terreiro dono da collection)\r\n  select public.is_terreiro_admin_or_editor(v_terreiro_id) into v_can_manage;\r\n\r\n  if not coalesce(v_can_manage, false) then\r\n    return jsonb_build_object(\r\n      'ok', false,\r\n      'error', 'forbidden_not_admin_or_editor',\r\n      'collection_id', p_collection_id,\r\n      'owner_terreiro_id', v_terreiro_id\r\n    );\r\n  end if;\r\n\r\n  -- 3) Contagens antes do delete (útil pra auditoria/UX)\r\n  v_counts := jsonb_build_object(\r\n    'collections_pontos', (select count(*) from public.collections_pontos cp where cp.collection_id = p_collection_id)\r\n  );\r\n\r\n  -- 4) Delete da collection (CASCADE remove collections_pontos)\r\n  delete from public.collections\r\n  where id = p_collection_id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'collection_id', p_collection_id,\r\n    'collection_title', v_title,\r\n    'owner_terreiro_id', v_terreiro_id,\r\n    'counts_before_delete', v_counts\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "delete_terreiro",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_is_admin boolean;\r\n  v_exists boolean;\r\n  v_bucket text := 'terreiros-images';\r\n  v_prefix text := 'terreiros/' || p_terreiro_id::text || '/';\r\n  v_counts jsonb;\r\nbegin\r\n  -- 1) Validar existência do terreiro\r\n  select exists(select 1 from public.terreiros t where t.id = p_terreiro_id) into v_exists;\r\n  if not v_exists then\r\n    return jsonb_build_object(\r\n      'ok', false,\r\n      'error', 'terreiro_not_found',\r\n      'terreiro_id', p_terreiro_id,\r\n      'storage', jsonb_build_object('bucket', v_bucket, 'prefix', v_prefix)\r\n    );\r\n  end if;\r\n\r\n  -- 2) Autorização: somente admin pode deletar\r\n  select public.is_terreiro_admin(p_terreiro_id) into v_is_admin;\r\n  if not coalesce(v_is_admin, false) then\r\n    return jsonb_build_object(\r\n      'ok', false,\r\n      'error', 'forbidden_not_admin',\r\n      'terreiro_id', p_terreiro_id,\r\n      'storage', jsonb_build_object('bucket', v_bucket, 'prefix', v_prefix)\r\n    );\r\n  end if;\r\n\r\n  -- 3) (Opcional, mas útil) coletar contagens antes do delete para auditoria/UX\r\n  v_counts := jsonb_build_object(\r\n    'collections', (select count(*) from public.collections c where c.owner_terreiro_id = p_terreiro_id),\r\n    'members', (select count(*) from public.terreiro_members m where m.terreiro_id = p_terreiro_id),\r\n    'invites', (select count(*) from public.terreiro_invites i where i.terreiro_id = p_terreiro_id),\r\n    'membership_requests', (select count(*) from public.terreiro_membership_requests r where r.terreiro_id = p_terreiro_id),\r\n    'custom_tags', (select count(*) from public.terreiro_ponto_custom_tags t where t.terreiro_id = p_terreiro_id),\r\n    'contatos', (select count(*) from public.terreiros_contatos ct where ct.terreiro_id = p_terreiro_id),\r\n    'responsaveis', (select count(*) from public.terreiros_responsaveis rr where rr.terreiro_id = p_terreiro_id)\r\n  );\r\n\r\n  -- 4) Bypass controlado para permitir CASCADE remover o último admin durante deleção do terreiro\r\n  perform set_config('app.deleting_terreiro', 'on', true);\r\n\r\n  -- 5) Delete do terreiro (cascatas cuidam das dependências)\r\n  delete from public.terreiros\r\n  where id = p_terreiro_id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'terreiro_id', p_terreiro_id,\r\n    'deleted', true,\r\n    'counts_before_delete', v_counts,\r\n    'storage', jsonb_build_object(\r\n      'bucket', v_bucket,\r\n      'prefix', v_prefix,\r\n      'example_object', v_prefix || 'cover.webp'\r\n    )\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "dev_schema_report",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_now timestamptz := now();\r\n\r\n  -- schema_report base\r\n  v_schema_json jsonb := jsonb_build_object(\r\n    'schema', p_schema,\r\n    'functions', '[]'::jsonb,\r\n    'tables', '[]'::jsonb\r\n  );\r\n\r\n  r_table record;\r\n  v_table_oid oid;\r\n\r\n  v_columns jsonb;\r\n  v_constraints jsonb;\r\n  v_indexes jsonb;\r\n  v_rls jsonb;\r\n  v_policies jsonb;\r\n  v_triggers jsonb;\r\n  v_enums jsonb;\r\n  v_samples jsonb;\r\n\r\n  v_table_obj jsonb;\r\n\r\n  -- functions\r\n  v_functions jsonb;\r\nbegin\r\n  if p_sample_limit is null or p_sample_limit < 0 then\r\n    p_sample_limit := 0;\r\n  end if;\r\n\r\n  /* =========================\r\n     FUNCTIONS (ALL FROM SCHEMA)\r\n  ========================= */\r\n  select coalesce(\r\n    jsonb_agg(\r\n      jsonb_build_object(\r\n        'schema', n.nspname,\r\n        'name', p.proname,\r\n        'args', pg_get_function_identity_arguments(p.oid),\r\n        'security_definer', p.prosecdef,\r\n        'language', l.lanname,\r\n        'definition', pg_get_functiondef(p.oid)\r\n      )\r\n      order by p.proname\r\n    ),\r\n    '[]'::jsonb\r\n  )\r\n  into v_functions\r\n  from pg_proc p\r\n  join pg_namespace n on n.oid = p.pronamespace\r\n  join pg_language l on l.oid = p.prolang\r\n  where n.nspname = p_schema;\r\n\r\n  v_schema_json := jsonb_set(\r\n    v_schema_json,\r\n    '{functions}',\r\n    v_functions,\r\n    true\r\n  );\r\n\r\n  for r_table in\r\n    select\r\n      c.oid as table_oid,\r\n      n.nspname as table_schema,\r\n      c.relname as table_name\r\n    from pg_class c\r\n    join pg_namespace n on n.oid = c.relnamespace\r\n    where n.nspname = p_schema\r\n      and c.relkind = 'r' -- ordinary table\r\n    order by c.relname\r\n  loop\r\n    v_table_oid := r_table.table_oid;\r\n\r\n    /* =========================\r\n       RLS\r\n    ========================= */\r\n    select jsonb_build_object(\r\n      'enabled', relrowsecurity,\r\n      'forced', relforcerowsecurity\r\n    )\r\n    into v_rls\r\n    from pg_class\r\n    where oid = v_table_oid;\r\n\r\n    /* =========================\r\n       COLUMNS\r\n    ========================= */\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'ordinal_position', a.attnum,\r\n          'column_name', a.attname,\r\n          'data_type', format_type(a.atttypid, a.atttypmod),\r\n          'is_nullable', not a.attnotnull,\r\n          'column_default', pg_get_expr(ad.adbin, ad.adrelid),\r\n          'identity', a.attidentity,\r\n          'generated', a.attgenerated\r\n        )\r\n        order by a.attnum\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_columns\r\n    from pg_attribute a\r\n    left join pg_attrdef ad\r\n      on ad.adrelid = a.attrelid\r\n     and ad.adnum = a.attnum\r\n    where a.attrelid = v_table_oid\r\n      and a.attnum > 0\r\n      and not a.attisdropped;\r\n\r\n    /* =========================\r\n       ENUMS (direto e array)\r\n    ========================= */\r\n    with col_types as (\r\n      select\r\n        a.attname as column_name,\r\n        t.oid as type_oid,\r\n        t.typname,\r\n        t.typtype,\r\n        t.typelem\r\n      from pg_attribute a\r\n      join pg_type t on t.oid = a.atttypid\r\n      where a.attrelid = v_table_oid\r\n        and a.attnum > 0\r\n        and not a.attisdropped\r\n    ),\r\n    enums_direct as (\r\n      select\r\n        column_name,\r\n        type_oid as enum_oid,\r\n        typname as enum_name\r\n      from col_types\r\n      where typtype = 'e'\r\n    ),\r\n    enums_array as (\r\n      select\r\n        c.column_name,\r\n        t_elem.oid as enum_oid,\r\n        t_elem.typname as enum_name\r\n      from col_types c\r\n      join pg_type t_elem on t_elem.oid = c.typelem\r\n      where t_elem.typtype = 'e'\r\n    ),\r\n    enums_all as (\r\n      select * from enums_direct\r\n      union all\r\n      select * from enums_array\r\n    )\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'column', ea.column_name,\r\n          'enum_type', ea.enum_name,\r\n          'values', (\r\n            select coalesce(jsonb_agg(e.enumlabel order by e.enumsortorder), '[]'::jsonb)\r\n            from pg_enum e\r\n            where e.enumtypid = ea.enum_oid\r\n          )\r\n        )\r\n        order by ea.column_name\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_enums\r\n    from enums_all ea;\r\n\r\n    /* =========================\r\n       CONSTRAINTS\r\n    ========================= */\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', conname,\r\n          'type',\r\n            case contype\r\n              when 'p' then 'PRIMARY_KEY'\r\n              when 'f' then 'FOREIGN_KEY'\r\n              when 'u' then 'UNIQUE'\r\n              when 'c' then 'CHECK'\r\n              when 'x' then 'EXCLUSION'\r\n            end,\r\n          'definition', pg_get_constraintdef(oid, true)\r\n        )\r\n        order by conname\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_constraints\r\n    from pg_constraint\r\n    where conrelid = v_table_oid;\r\n\r\n    /* =========================\r\n       INDEXES\r\n    ========================= */\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', indexname,\r\n          'definition', indexdef\r\n        )\r\n        order by indexname\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_indexes\r\n    from pg_indexes\r\n    where schemaname = r_table.table_schema\r\n      and tablename = r_table.table_name;\r\n\r\n    /* =========================\r\n       POLICIES\r\n    ========================= */\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', polname,\r\n          'command',\r\n            case polcmd\r\n              when 'r' then 'SELECT'\r\n              when 'a' then 'INSERT'\r\n              when 'w' then 'UPDATE'\r\n              when 'd' then 'DELETE'\r\n              when '*' then 'ALL'\r\n            end,\r\n          'roles',\r\n            coalesce(\r\n              (\r\n                select jsonb_agg(rolname order by rolname)\r\n                from pg_roles\r\n                where oid = any(polroles)\r\n              ),\r\n              '[]'::jsonb\r\n            ),\r\n          'using', pg_get_expr(polqual, polrelid, true),\r\n          'with_check', pg_get_expr(polwithcheck, polrelid, true)\r\n        )\r\n        order by polname\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_policies\r\n    from pg_policy\r\n    where polrelid = v_table_oid;\r\n\r\n    /* =========================\r\n       TRIGGERS\r\n    ========================= */\r\n    select coalesce(\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', tgname,\r\n          'enabled',\r\n            case tgenabled\r\n              when 'D' then false\r\n              else true\r\n            end,\r\n          'enabled_mode',\r\n            case tgenabled\r\n              when 'O' then 'enabled'\r\n              when 'D' then 'disabled'\r\n              when 'R' then 'replica'\r\n              when 'A' then 'always'\r\n              else tgenabled\r\n            end,\r\n          'definition', pg_get_triggerdef(oid, true)\r\n        )\r\n        order by tgname\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n    into v_triggers\r\n    from pg_trigger\r\n    where tgrelid = v_table_oid\r\n      and not tgisinternal;\r\n\r\n    /* =========================\r\n       SAMPLE ROWS\r\n    ========================= */\r\n    if p_sample_limit = 0 then\r\n      v_samples := '[]'::jsonb;\r\n    else\r\n      execute format(\r\n        'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb)\r\n         from (select * from %I.%I limit %s) t',\r\n        r_table.table_schema,\r\n        r_table.table_name,\r\n        p_sample_limit\r\n      )\r\n      into v_samples;\r\n    end if;\r\n\r\n    /* =========================\r\n       BUILD TABLE OBJ\r\n    ========================= */\r\n    v_table_obj := jsonb_build_object(\r\n      'oid', v_table_oid::text,\r\n      'name', r_table.table_name,\r\n      'rls', v_rls,\r\n      'columns', v_columns,\r\n      'enums', v_enums,\r\n      'constraints', v_constraints,\r\n      'indexes', v_indexes,\r\n      'policies', v_policies,\r\n      'triggers', v_triggers,\r\n      'sample_rows', v_samples\r\n    );\r\n\r\n    /* =========================\r\n       APPEND TABLE OBJ INTO tables[]\r\n    ========================= */\r\n    v_schema_json := jsonb_set(\r\n      v_schema_json,\r\n      '{tables}',\r\n      (v_schema_json->'tables') || jsonb_build_array(v_table_obj),\r\n      true\r\n    );\r\n  end loop;\r\n\r\n  return jsonb_build_object(\r\n    'generated_at', v_now,\r\n    'schema_report', v_schema_json\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "dev_schema_report",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  result jsonb;\r\nbegin\r\n  with schemas as (\r\n    select n.oid as schema_oid, n.nspname as schema_name\r\n    from pg_namespace n\r\n    where n.nspname = any(_schemas)\r\n  ),\r\n  tables as (\r\n    select\r\n      s.schema_name,\r\n      c.oid as table_oid,\r\n      c.relname as table_name,\r\n      c.relrowsecurity as rls_enabled,\r\n      c.relforcerowsecurity as rls_forced\r\n    from pg_class c\r\n    join schemas s on s.schema_oid = c.relnamespace\r\n    where c.relkind = 'r' -- ordinary table\r\n  ),\r\n  table_columns as (\r\n    select\r\n      c.table_schema,\r\n      c.table_name,\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'ordinal_position', c.ordinal_position,\r\n          'column_name', c.column_name,\r\n          'data_type', c.data_type,\r\n          'udt_name', c.udt_name,\r\n          'is_nullable', c.is_nullable,\r\n          'column_default', c.column_default,\r\n          'is_identity', c.is_identity,\r\n          'identity_generation', c.identity_generation,\r\n          'is_generated', c.is_generated,\r\n          'generation_expression', c.generation_expression,\r\n          'character_maximum_length', c.character_maximum_length,\r\n          'numeric_precision', c.numeric_precision,\r\n          'numeric_scale', c.numeric_scale\r\n        )\r\n        order by c.ordinal_position\r\n      ) as columns_json\r\n    from information_schema.columns c\r\n    where c.table_schema = any(_schemas)\r\n    group by c.table_schema, c.table_name\r\n  ),\r\n  table_constraints as (\r\n    select\r\n      t.schema_name as table_schema,\r\n      t.table_name,\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', con.conname,\r\n          'type',\r\n            case con.contype\r\n              when 'p' then 'PRIMARY_KEY'\r\n              when 'u' then 'UNIQUE'\r\n              when 'f' then 'FOREIGN_KEY'\r\n              when 'c' then 'CHECK'\r\n              when 'x' then 'EXCLUSION'\r\n              else con.contype::text\r\n            end,\r\n          'definition', pg_get_constraintdef(con.oid, true)\r\n        )\r\n        order by con.conname\r\n      ) as constraints_json\r\n    from tables t\r\n    left join pg_constraint con on con.conrelid = t.table_oid\r\n    group by t.schema_name, t.table_name\r\n  ),\r\n  table_indexes as (\r\n    select\r\n      t.schema_name as table_schema,\r\n      t.table_name,\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', i.indexname,\r\n          'definition', i.indexdef\r\n        )\r\n        order by i.indexname\r\n      ) as indexes_json\r\n    from tables t\r\n    left join pg_indexes i\r\n      on i.schemaname = t.schema_name\r\n     and i.tablename  = t.table_name\r\n    group by t.schema_name, t.table_name\r\n  ),\r\n  table_policies as (\r\n    select\r\n      p.schemaname as table_schema,\r\n      p.tablename as table_name,\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', p.policyname,\r\n          'command', p.cmd,\r\n          'roles', p.roles,\r\n          'using', p.qual,\r\n          'with_check', p.with_check\r\n        )\r\n        order by p.policyname\r\n      ) as policies_json\r\n    from pg_policies p\r\n    where p.schemaname = any(_schemas)\r\n    group by p.schemaname, p.tablename\r\n  ),\r\n  table_triggers as (\r\n    select\r\n      t.schema_name as table_schema,\r\n      t.table_name,\r\n      jsonb_agg(\r\n        jsonb_build_object(\r\n          'name', tg.tgname,\r\n          'enabled',\r\n            case tg.tgenabled\r\n              when 'O' then true  -- enabled\r\n              when 'D' then false -- disabled\r\n              when 'R' then true  -- enabled for replica\r\n              when 'A' then true  -- enabled always\r\n              else null\r\n            end,\r\n          'definition', pg_get_triggerdef(tg.oid, true)\r\n        )\r\n        order by tg.tgname\r\n      ) as triggers_json\r\n    from tables t\r\n    left join pg_trigger tg\r\n      on tg.tgrelid = t.table_oid\r\n     and tg.tgisinternal = false\r\n    group by t.schema_name, t.table_name\r\n  )\r\n  select jsonb_build_object(\r\n    'generated_at', now(),\r\n    'schemas', jsonb_agg(\r\n      jsonb_build_object(\r\n        'schema', s.schema_name,\r\n        'tables', (\r\n          select jsonb_agg(\r\n            jsonb_build_object(\r\n              'schema', tb.schema_name,\r\n              'name', tb.table_name,\r\n              'oid', tb.table_oid,\r\n              'rls', jsonb_build_object(\r\n                'enabled', tb.rls_enabled,\r\n                'forced', tb.rls_forced\r\n              ),\r\n              'columns', coalesce(tc.columns_json, '[]'::jsonb),\r\n              'constraints', coalesce(ct.constraints_json, '[]'::jsonb),\r\n              'indexes', coalesce(ix.indexes_json, '[]'::jsonb),\r\n              'policies', coalesce(po.policies_json, '[]'::jsonb),\r\n              'triggers', coalesce(tr.triggers_json, '[]'::jsonb)\r\n            )\r\n            order by tb.table_name\r\n          )\r\n          from tables tb\r\n          left join table_columns tc\r\n            on tc.table_schema = tb.schema_name\r\n           and tc.table_name   = tb.table_name\r\n          left join table_constraints ct\r\n            on ct.table_schema = tb.schema_name\r\n           and ct.table_name   = tb.table_name\r\n          left join table_indexes ix\r\n            on ix.table_schema = tb.schema_name\r\n           and ix.table_name   = tb.table_name\r\n          left join table_policies po\r\n            on po.table_schema = tb.schema_name\r\n           and po.table_name   = tb.table_name\r\n          left join table_triggers tr\r\n            on tr.table_schema = tb.schema_name\r\n           and tr.table_name   = tb.table_name\r\n          where tb.schema_name = s.schema_name\r\n        )\r\n      )\r\n      order by s.schema_name\r\n    )\r\n  )\r\n  into result\r\n  from schemas s;\r\n\r\n  return coalesce(result, jsonb_build_object('generated_at', now(), 'schemas', '[]'::jsonb));\r\nend;\r\n"
        },
        {
          "routine_name": "enforce_audio_duration_on_approval",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  v_ponto_audio_id uuid;\r\n  v_duration_ms bigint;\r\nbegin\r\n  -- Só dispara quando a submission vira approved\r\n  if (tg_op = 'UPDATE')\r\n     and (new.status = 'approved')\r\n     and (old.status is distinct from new.status)\r\n     and (new.kind = 'audio_upload') then\r\n\r\n    -- OPÇÃO A (definitiva): coluna ponto_audio_id na submission\r\n    v_ponto_audio_id := new.ponto_audio_id;\r\n\r\n    if v_ponto_audio_id is null then\r\n      raise exception 'Não é possível aprovar: submission não possui ponto_audio_id.';\r\n    end if;\r\n\r\n    select pa.duration_ms\r\n      into v_duration_ms\r\n    from public.ponto_audios pa\r\n    where pa.id = v_ponto_audio_id;\r\n\r\n    if v_duration_ms is null then\r\n      raise exception 'Não é possível aprovar: duration_ms não está preenchido para o áudio (%).', v_ponto_audio_id;\r\n    end if;\r\n\r\n    if v_duration_ms <= 0 then\r\n      raise exception 'Não é possível aprovar: duration_ms inválido (%).', v_duration_ms;\r\n    end if;\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "finalize_ponto_audio_and_create_submission",
          "routine_type": "FUNCTION",
          "return_type": "uuid",
          "routine_definition": "\r\ndeclare\r\n  v_submission_id uuid;\r\n  v_audio_status text;\r\n  v_bucket text;\r\n  v_path text;\r\nbegin\r\n  -- trava a linha do áudio\r\n  select upload_status, storage_bucket, storage_path\r\n    into v_audio_status, v_bucket, v_path\r\n  from ponto_audios\r\n  where id = p_ponto_audio_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'ponto_audio not found';\r\n  end if;\r\n\r\n  if v_audio_status <> 'uploaded' then\r\n    raise exception 'ponto_audio not uploaded yet';\r\n  end if;\r\n\r\n  -- exige que a submission já exista (criada no init-upload)\r\n  select id\r\n    into v_submission_id\r\n  from pontos_submissions\r\n  where ponto_audio_id = p_ponto_audio_id\r\n    and kind = 'audio_upload';\r\n\r\n  if v_submission_id is null then\r\n    raise exception 'audio_upload submission not initialized (init-upload missing)';\r\n  end if;\r\n\r\n  -- atualiza para ficar consistente e habilitar curadoria\r\n  update pontos_submissions\r\n  set\r\n    ponto_id = p_ponto_id,\r\n    has_audio = true,\r\n    audio_bucket_id = v_bucket,\r\n    audio_object_path = v_path\r\n  where id = v_submission_id;\r\n\r\n  return v_submission_id;\r\nend;\r\n"
        },
        {
          "routine_name": "fn_create_terreiro",
          "routine_type": "FUNCTION",
          "return_type": "uuid",
          "routine_definition": "\r\ndeclare\r\n  v_terreiro_id uuid;\r\n  v_uid uuid;\r\n  v_instagram text;\r\nbegin\r\n  v_uid := auth.uid();\r\n\r\n  if v_uid is null then\r\n    raise exception 'Not authenticated';\r\n  end if;\r\n\r\n  if p_title is null or btrim(p_title) = '' then\r\n    raise exception 'title is required';\r\n  end if;\r\n\r\n  if p_state is null or btrim(p_state) = '' then\r\n    raise exception 'state is required';\r\n  end if;\r\n\r\n  if p_city is null or btrim(p_city) = '' then\r\n    raise exception 'city is required';\r\n  end if;\r\n\r\n  if p_address is null or btrim(p_address) = '' then\r\n    raise exception 'address is required';\r\n  end if;\r\n\r\n  -- Normaliza instagram\r\n  if p_instagram_handle is null or btrim(p_instagram_handle) = '' then\r\n    v_instagram := null;\r\n  else\r\n    v_instagram := btrim(p_instagram_handle);\r\n    if left(v_instagram, 1) <> '@' then\r\n      v_instagram := '@' || v_instagram;\r\n    end if;\r\n  end if;\r\n\r\n  -- Cria o terreiro\r\n  insert into public.terreiros (\r\n    title,\r\n    about,\r\n    lines_of_work,\r\n    cover_image_url,\r\n    created_by\r\n  )\r\n  values (\r\n    btrim(p_title),\r\n    p_about,\r\n    p_lines_of_work,\r\n    p_cover_image_url,\r\n    v_uid\r\n  )\r\n  returning id into v_terreiro_id;\r\n\r\n  -- Cria membership admin\r\n  insert into public.terreiro_members (\r\n    terreiro_id,\r\n    user_id,\r\n    role,\r\n    status\r\n  )\r\n  values (\r\n    v_terreiro_id,\r\n    v_uid,\r\n    'admin',\r\n    'active'\r\n  );\r\n\r\n  -- Cria contato principal\r\n  insert into public.terreiros_contatos (\r\n    terreiro_id,\r\n    kind,\r\n    city,\r\n    state,\r\n    neighborhood,\r\n    address,\r\n    phone_whatsapp,\r\n    instagram_handle,\r\n    is_primary,\r\n    is_active,\r\n    created_by\r\n  )\r\n  values (\r\n    v_terreiro_id,\r\n    'principal',\r\n    btrim(p_city),\r\n    btrim(p_state),\r\n    p_neighborhood,\r\n    p_address,\r\n    p_phone_digits,\r\n    v_instagram,\r\n    true,\r\n    true,\r\n    v_uid\r\n  );\r\n\r\n  return v_terreiro_id;\r\nend;\r\n"
        },
        {
          "routine_name": "fn_get_terreiro_member_identity",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\nbegin\r\n  if p_terreiro_id is null then\r\n    raise exception 'terreiro_id is required';\r\n  end if;\r\n\r\n  -- Require admin/editor on this terreiro.\r\n  if not exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role in ('admin', 'editor')\r\n      and (tm.status is null or tm.status = 'active')\r\n  ) then\r\n    raise exception 'insufficient_privilege';\r\n  end if;\r\n\r\n  return query\r\n  select\r\n    tm.user_id,\r\n    lower(au.email) as email\r\n  from public.terreiro_members tm\r\n  join auth.users au\r\n    on au.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and tm.role in ('admin', 'editor', 'member')\r\n    and (tm.status is null or tm.status = 'active')\r\n  order by tm.created_at asc nulls last;\r\nend;\r\n"
        },
        {
          "routine_name": "fn_normalize_email",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  new.email := lower(trim(new.email));\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "fn_remove_terreiro_member",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_is_admin boolean;\r\n  v_exists boolean;\r\nbegin\r\n  if auth.uid() is null then\r\n    raise exception 'not_authenticated';\r\n  end if;\r\n\r\n  -- Só admin pode remover membro\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role = 'admin'\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  ) into v_is_admin;\r\n\r\n  if not v_is_admin then\r\n    raise exception 'not_allowed';\r\n  end if;\r\n\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = p_user_id\r\n  ) into v_exists;\r\n\r\n  if not v_exists then\r\n    return jsonb_build_object(\r\n      'ok', true,\r\n      'deleted', false,\r\n      'reason', 'not_found'\r\n    );\r\n  end if;\r\n\r\n  delete from public.terreiro_members\r\n  where terreiro_id = p_terreiro_id\r\n    and user_id = p_user_id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'deleted', true,\r\n    'terreiro_id', p_terreiro_id,\r\n    'user_id', p_user_id\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "get_app_install_url",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\n  select jsonb_build_object(\r\n    'key', 'app_install_url',\r\n    'value', pac.value,\r\n    'updated_at', pac.updated_at\r\n  )\r\n  from public.public_app_config pac\r\n  where pac.key = 'app_install_url'\r\n  limit 1;\r\n"
        },
        {
          "routine_name": "get_terreiro_member_profile",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  with viewer as (\r\n    select\r\n      tm.role as viewer_role\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and coalesce(tm.status, 'active') = 'active'\r\n    limit 1\r\n  )\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url,\r\n\r\n    /* role/status:\r\n       - visível para membros e admins\r\n       - oculto para visitante\r\n    */\r\n    case\r\n      when exists (select 1 from viewer) then tm.role\r\n      else null\r\n    end as role,\r\n\r\n    case\r\n      when exists (select 1 from viewer) then coalesce(tm.status, 'active')\r\n      else null\r\n    end as status,\r\n\r\n    /* email:\r\n       - somente admin/editor\r\n    */\r\n    case\r\n      when (select viewer_role from viewer) in ('admin', 'editor')\r\n      then p.email\r\n      else null\r\n    end as email,\r\n\r\n    case\r\n      when (select viewer_role from viewer) in ('admin', 'editor')\r\n      then coalesce(p.email_verified, false)\r\n      else null\r\n    end as email_verified\r\n\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and tm.user_id = p_user_id\r\n    and coalesce(tm.status, 'active') = 'active';\r\n"
        },
        {
          "routine_name": "get_terreiro_members_count",
          "routine_type": "FUNCTION",
          "return_type": "bigint",
          "routine_definition": "\r\n  select count(*)::bigint\r\n  from public.terreiro_members tm\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active';\r\n"
        },
        {
          "routine_name": "get_terreiro_members_for_admins",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url,\r\n    tm.role,\r\n    coalesce(tm.status, 'active') as status,\r\n    p.email,\r\n    coalesce(p.email_verified, false) as email_verified\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n    and exists (\r\n      select 1\r\n      from public.terreiro_members me\r\n      where me.terreiro_id = p_terreiro_id\r\n        and me.user_id = auth.uid()\r\n        and coalesce(me.status, 'active') = 'active'\r\n        and me.role in ('admin', 'editor')\r\n    )\r\n  order by\r\n    case tm.role\r\n      when 'admin' then 1\r\n      when 'editor' then 2\r\n      when 'member' then 3\r\n      else 9\r\n    end,\r\n    lower(coalesce(p.full_name, '')) asc,\r\n    tm.user_id asc\r\n  limit greatest(0, least(p_limit, 100))\r\n  offset greatest(0, p_offset);\r\n"
        },
        {
          "routine_name": "get_terreiro_members_for_admins",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url,\r\n    tm.role,\r\n    coalesce(tm.status, 'active') as status,\r\n    p.email,\r\n    coalesce(p.email_verified, false) as email_verified\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n    and exists (\r\n      select 1\r\n      from public.terreiro_members me\r\n      where me.terreiro_id = p_terreiro_id\r\n        and me.user_id = auth.uid()\r\n        and coalesce(me.status, 'active') = 'active'\r\n        and me.role in ('admin', 'editor')\r\n    )\r\n  order by\r\n    case tm.role\r\n      when 'admin' then 1\r\n      when 'editor' then 2\r\n      when 'member' then 3\r\n      else 9\r\n    end,\r\n    lower(coalesce(p.full_name, '')) asc;\r\n"
        },
        {
          "routine_name": "get_terreiro_members_for_members",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url,\r\n    tm.role,\r\n    coalesce(tm.status, 'active') as status\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n    and public.is_terreiro_member(p_terreiro_id)\r\n  order by\r\n    case tm.role\r\n      when 'admin' then 1\r\n      when 'editor' then 2\r\n      when 'member' then 3\r\n      else 9\r\n    end,\r\n    lower(coalesce(p.full_name, '')) asc;\r\n"
        },
        {
          "routine_name": "get_terreiro_members_for_members",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url,\r\n    tm.role,\r\n    coalesce(tm.status, 'active') as status\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n    and public.is_terreiro_member(p_terreiro_id)\r\n  order by\r\n    case tm.role\r\n      when 'admin' then 1\r\n      when 'editor' then 2\r\n      when 'member' then 3\r\n      else 9\r\n    end,\r\n    lower(coalesce(p.full_name, '')) asc,\r\n    tm.user_id asc\r\n  limit greatest(0, least(p_limit, 100))\r\n  offset greatest(0, p_offset);\r\n"
        },
        {
          "routine_name": "get_terreiro_members_public",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n  order by\r\n    lower(coalesce(p.full_name, '')) asc,\r\n    tm.user_id asc\r\n  limit greatest(0, least(p_limit, 100))\r\n  offset greatest(0, p_offset);\r\n"
        },
        {
          "routine_name": "get_terreiro_members_public",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\n  select\r\n    tm.user_id,\r\n    p.full_name,\r\n    p.avatar_url\r\n  from public.terreiro_members tm\r\n  join public.profiles p on p.id = tm.user_id\r\n  where tm.terreiro_id = p_terreiro_id\r\n    and coalesce(tm.status, 'active') = 'active'\r\n  order by lower(coalesce(p.full_name, '')) asc;\r\n"
        },
        {
          "routine_name": "gin_extract_query_trgm",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gin_extract_value_trgm",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gin_trgm_consistent",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "gin_trgm_triconsistent",
          "routine_type": "FUNCTION",
          "return_type": "\"char\"",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_compress",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_consistent",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_decompress",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_distance",
          "routine_type": "FUNCTION",
          "return_type": "double precision",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_in",
          "routine_type": "FUNCTION",
          "return_type": "USER-DEFINED",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_options",
          "routine_type": "FUNCTION",
          "return_type": "void",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_out",
          "routine_type": "FUNCTION",
          "return_type": "cstring",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_penalty",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_picksplit",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_same",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "gtrgm_union",
          "routine_type": "FUNCTION",
          "return_type": "USER-DEFINED",
          "routine_definition": null
        },
        {
          "routine_name": "guard_ponto_audio_set_active_requires_approved_submission",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nDECLARE\r\n  found_approved_submission boolean;\r\nBEGIN\r\n  IF new.is_active IS TRUE\r\n     AND (tg_op = 'INSERT' OR old.is_active IS DISTINCT FROM new.is_active) THEN\r\n\r\n    IF new.upload_status <> 'uploaded'::audio_upload_status THEN\r\n      RAISE EXCEPTION 'invalid_audio_state: cannot activate ponto_audio % (upload_status=%). expected uploaded',\r\n        new.id, new.upload_status;\r\n    END IF;\r\n\r\n    SELECT EXISTS (\r\n      SELECT 1\r\n      FROM public.pontos_submissions ps\r\n      WHERE ps.status = 'approved'::ponto_submission_status\r\n        AND ps.ponto_audio_id = new.id\r\n        AND ps.kind IN (\r\n          'audio_upload'::ponto_submission_kind,\r\n          'new'::ponto_submission_kind,\r\n          'variation'::ponto_submission_kind\r\n        )\r\n    ) INTO found_approved_submission;\r\n\r\n    IF NOT found_approved_submission THEN\r\n      RAISE EXCEPTION 'invalid_activation: cannot activate ponto_audio % without approved submission',\r\n        new.id;\r\n    END IF;\r\n\r\n    -- Unicidade por versão\r\n    IF new.ponto_versao_id IS NOT NULL THEN\r\n      IF EXISTS (\r\n        SELECT 1 FROM public.ponto_audios pa\r\n        WHERE pa.ponto_versao_id = new.ponto_versao_id\r\n          AND pa.is_active = true\r\n          AND pa.id <> new.id\r\n      ) THEN\r\n        RAISE EXCEPTION 'invalid_activation: another active audio already exists for ponto_versao_id %',\r\n          new.ponto_versao_id;\r\n      END IF;\r\n    ELSE\r\n      IF EXISTS (\r\n        SELECT 1 FROM public.ponto_audios pa\r\n        WHERE pa.ponto_id = new.ponto_id\r\n          AND pa.is_active = true\r\n          AND pa.id <> new.id\r\n      ) THEN\r\n        RAISE EXCEPTION 'invalid_activation: another active audio already exists for ponto_id %',\r\n          new.ponto_id;\r\n      END IF;\r\n    END IF;\r\n\r\n  END IF;\r\n\r\n  RETURN new;\r\nEND;\r\n"
        },
        {
          "routine_name": "handle_new_user",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  insert into public.profiles (id)\r\n  values (new.id)\r\n  on conflict (id) do nothing;\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "is_dev_master",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.dev_masters dm\r\n    where dm.user_id = auth.uid()\r\n  );\r\n"
        },
        {
          "routine_name": "is_terreiro_admin",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role = 'admin'\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  );\r\n"
        },
        {
          "routine_name": "is_terreiro_admin_or_editor",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role in ('admin','curimba')\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  );\r\n"
        },
        {
          "routine_name": "is_terreiro_creator",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiros t\r\n    where t.id = p_terreiro_id\r\n      and t.created_by = auth.uid()\r\n  );\r\n"
        },
        {
          "routine_name": "is_terreiro_member",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = p_terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and coalesce(tm.status, 'active') = 'active'\r\n  );\r\n"
        },
        {
          "routine_name": "log_ponto_update",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  v_sub text;\r\n  v_uid uuid;\r\nbegin\r\n  -- Pega o \"sub\" diretamente do contexto do PostgREST\r\n  v_sub := current_setting('request.jwt.claim.sub', true);\r\n\r\n  if v_sub is not null and v_sub <> '' then\r\n    v_uid := v_sub::uuid;\r\n  else\r\n    v_uid := null;\r\n  end if;\r\n\r\n  insert into public.ponto_change_logs (\r\n    ponto_id,\r\n    action,\r\n    changed_by,\r\n    before,\r\n    after\r\n  )\r\n  values (\r\n    old.id,\r\n    'UPDATE',\r\n    v_uid,\r\n    to_jsonb(old),\r\n    to_jsonb(new)\r\n  );\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "normalize_search_text",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": "\r\n  select trim(\r\n    regexp_replace(\r\n      regexp_replace(\r\n        regexp_replace(\r\n          unaccent(lower(coalesce(input, ''))),\r\n          E'[\\\\n\\\\r\\\\t]+', ' ', 'g'\r\n        ),\r\n        E'[^a-z0-9 ]+', ' ', 'g'\r\n      ),\r\n      E'\\\\s+', ' ', 'g'\r\n    )\r\n  );\r\n"
        },
        {
          "routine_name": "normalize_tag_text",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": "\r\n  select nullif(\r\n    regexp_replace(\r\n      lower(trim(unaccent(input))),\r\n      '\\s+',\r\n      ' ',\r\n      'g'\r\n    ),\r\n    ''\r\n  );\r\n"
        },
        {
          "routine_name": "normalize_text",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": "\r\n  select lower(unaccent(coalesce(input, '')));\r\n"
        },
        {
          "routine_name": "on_curator_revoked_disable_mode",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  update public.profiles\r\n  set curator_mode_enabled = false\r\n  where id = old.user_id;\r\n\r\n  return old;\r\nend;\r\n"
        },
        {
          "routine_name": "on_custom_tag_changed_refresh_ponto",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  if (tg_op = 'DELETE') then\r\n    perform public.refresh_ponto_search_tags_extra(old.ponto_id);\r\n    return old;\r\n  else\r\n    perform public.refresh_ponto_search_tags_extra(new.ponto_id);\r\n    return new;\r\n  end if;\r\nend;\r\n"
        },
        {
          "routine_name": "pontos_autotag_trigger",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  auto_tags text[];\r\n  existing text[];\r\n  t text;\r\n  norm_existing text[];\r\n  norm_t text;\r\nbegin\r\n  existing := coalesce(new.tags, '{}'::text[]);\r\n  auto_tags := public.tags_from_lyrics(new.lyrics);\r\n\r\n  -- Construir um \"set\" de normalizados já presentes, preservando ordem original\r\n  norm_existing := array(\r\n    select public.normalize_text(x)\r\n    from unnest(existing) as x\r\n    where x is not null and btrim(x) <> ''\r\n  );\r\n\r\n  -- Primeiro: limpar tags existentes (trim, remover vazias), mantendo ordem\r\n  existing := array(\r\n    select x\r\n    from unnest(existing) as x\r\n    where x is not null and btrim(x) <> ''\r\n  );\r\n\r\n  -- Depois: anexar auto-tags canônicas se não existirem (por normalização)\r\n  foreach t in array auto_tags loop\r\n    norm_t := public.normalize_text(t);\r\n    if norm_t = '' then\r\n      continue;\r\n    end if;\r\n\r\n    if norm_t = any(norm_existing) then\r\n      continue;\r\n    end if;\r\n\r\n    existing := array_append(existing, t);\r\n    norm_existing := array_append(norm_existing, norm_t);\r\n  end loop;\r\n\r\n  new.tags := coalesce(existing, '{}'::text[]);\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "pontos_search_fields_sync",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  new.search_text :=\r\n    public.normalize_search_text(\r\n      coalesce(new.title, '') || ' ' ||\r\n      coalesce(new.lyrics, '') || ' ' ||\r\n      coalesce(array_to_string(new.tags, ' '), '') || ' ' ||\r\n      coalesce(array_to_string(new.search_tags_extra, ' '), '')\r\n    );\r\n\r\n  new.search_tsv :=\r\n    to_tsvector('simple', coalesce(new.search_text, ''));\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "pontos_submissions_autotag_trigger",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  auto_tags text[];\r\n  existing text[];\r\n  norm_existing text[];\r\n  t text;\r\n  norm_t text;\r\nbegin\r\n  existing := coalesce(new.tags, '{}'::text[]);\r\n  auto_tags := public.tags_from_lyrics(new.lyrics);\r\n\r\n  norm_existing := array(\r\n    select public.normalize_text(x)\r\n    from unnest(existing) as x\r\n    where x is not null and btrim(x) <> ''\r\n  );\r\n\r\n  existing := array(\r\n    select x\r\n    from unnest(existing) as x\r\n    where x is not null and btrim(x) <> ''\r\n  );\r\n\r\n  foreach t in array auto_tags loop\r\n    norm_t := public.normalize_text(t);\r\n    if norm_t = '' then\r\n      continue;\r\n    end if;\r\n\r\n    if norm_t = any(norm_existing) then\r\n      continue;\r\n    end if;\r\n\r\n    existing := array_append(existing, t);\r\n    norm_existing := array_append(norm_existing, norm_t);\r\n  end loop;\r\n\r\n  new.tags := coalesce(existing, '{}'::text[]);\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "pontos_submissions_guard_trigger",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  is_curator boolean;\r\nbegin\r\n  is_curator := exists (select 1 from public.curators c where c.user_id = auth.uid());\r\n\r\n  if not is_curator then\r\n    if new.status is distinct from old.status\r\n       or new.reviewed_at is distinct from old.reviewed_at\r\n       or new.reviewed_by is distinct from old.reviewed_by\r\n       or new.approved_ponto_id is distinct from old.approved_ponto_id\r\n       or new.review_note is distinct from old.review_note\r\n    then\r\n      raise exception 'Not allowed: only curators can review/approve/reject submissions';\r\n    end if;\r\n\r\n    if old.status <> 'pending' then\r\n      raise exception 'Not allowed: submission is no longer pending';\r\n    end if;\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "refresh_ponto_search_tags_extra",
          "routine_type": "FUNCTION",
          "return_type": "void",
          "routine_definition": "\r\ndeclare\r\n  v_tags text[];\r\nbegin\r\n  select\r\n    coalesce(array_agg(distinct t.tag_text_normalized order by t.tag_text_normalized), '{}'::text[])\r\n  into v_tags\r\n  from public.terreiro_ponto_custom_tags t\r\n  where t.ponto_id = p_ponto_id;\r\n\r\n  update public.pontos p\r\n  set search_tags_extra = v_tags\r\n  where p.id = p_ponto_id;\r\n\r\n  -- Esse update dispara o trg_pontos_search_fields_sync e recalcula search_text/search_tsv\r\nend;\r\n"
        },
        {
          "routine_name": "reject_audio_upload_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_is_curator boolean;\r\n  s public.pontos_submissions%rowtype;\r\n  a public.ponto_audios%rowtype;\r\nbegin\r\n  -- Permissão: só curadoras\r\n  select exists (\r\n    select 1\r\n    from public.curators c\r\n    where c.user_id = auth.uid()\r\n  ) into v_is_curator;\r\n\r\n  if not v_is_curator then\r\n    raise exception 'not_allowed: only curators can reject audio submissions';\r\n  end if;\r\n\r\n  -- review_note obrigatório\r\n  if p_review_note is null or length(btrim(p_review_note)) = 0 then\r\n    raise exception 'invalid_review_note: review_note is required';\r\n  end if;\r\n\r\n  -- Lock submission\r\n  select *\r\n  into s\r\n  from public.pontos_submissions\r\n  where id = p_submission_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'not_found: submission %', p_submission_id;\r\n  end if;\r\n\r\n  if s.status <> 'pending' then\r\n    raise exception 'invalid_status: submission % is % (expected pending)', p_submission_id, s.status;\r\n  end if;\r\n\r\n  if s.kind <> 'audio_upload' then\r\n    raise exception 'invalid_kind: submission % is % (expected audio_upload)', p_submission_id, s.kind;\r\n  end if;\r\n\r\n  if s.ponto_audio_id is null then\r\n    raise exception 'invalid_submission: audio_upload requires ponto_audio_id';\r\n  end if;\r\n\r\n  -- Lock audio (se existir) e desativa para garantir que não fica público\r\n  select *\r\n  into a\r\n  from public.ponto_audios\r\n  where id = s.ponto_audio_id\r\n  for update;\r\n\r\n  if found then\r\n    update public.ponto_audios\r\n    set is_active = false\r\n    where id = a.id;\r\n  end if;\r\n\r\n  -- Rejeição\r\n  update public.pontos_submissions\r\n  set\r\n    status      = 'rejected',\r\n    reviewed_by = auth.uid(),\r\n    reviewed_at = now(),\r\n    review_note = p_review_note\r\n  where id = s.id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'submission_id', s.id,\r\n    'decision', 'rejected',\r\n    'ponto_id', s.ponto_id,\r\n    'ponto_audio_id', s.ponto_audio_id\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "reject_curator_invite",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_ok int;\r\nbegin\r\n  v_email := lower((auth.jwt() ->> 'email'));\r\n\r\n  if v_email is null or v_email = '' then\r\n    raise exception 'missing_email_claim';\r\n  end if;\r\n\r\n  update public.curator_invites\r\n     set status = 'rejected',\r\n         responded_at = now()\r\n   where id = p_invite_id\r\n     and status = 'pending'\r\n     and now() < expires_at\r\n     and lower(email) = v_email\r\n  returning 1 into v_ok;\r\n\r\n  return coalesce(v_ok, 0) = 1;\r\nend;\r\n"
        },
        {
          "routine_name": "reject_ponto_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_is_curator boolean;\r\n  s public.pontos_submissions%rowtype;\r\nbegin\r\n  -- 1) Permissão: só curadoras\r\n  select exists (\r\n    select 1\r\n    from public.curators c\r\n    where c.user_id = auth.uid()\r\n  ) into v_is_curator;\r\n\r\n  if not v_is_curator then\r\n    raise exception 'not_allowed: only curators can reject submissions';\r\n  end if;\r\n\r\n  -- 2) Lock da submission\r\n  select *\r\n  into s\r\n  from public.pontos_submissions\r\n  where id = p_submission_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'not_found: submission %', p_submission_id;\r\n  end if;\r\n\r\n  if s.status <> 'pending' then\r\n    raise exception 'invalid_status: submission % is % (expected pending)', p_submission_id, s.status;\r\n  end if;\r\n\r\n  if p_review_note is null or length(trim(p_review_note)) = 0 then\r\n    raise exception 'invalid_review_note: review_note is required';\r\n  end if;\r\n\r\n  -- 3) Rejeita\r\n  update public.pontos_submissions\r\n  set\r\n    status      = 'rejected',\r\n    reviewed_by = auth.uid(),\r\n    reviewed_at = now(),\r\n    review_note = p_review_note\r\n  where id = s.id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'submission_id', s.id,\r\n    'status', 'rejected'\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "reject_terreiro_invite",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_email text;\r\n  v_invite record;\r\nbegin\r\n  if auth.uid() is null then\r\n    raise exception 'Not authenticated';\r\n  end if;\r\n\r\n  v_email := lower(trim((auth.jwt() ->> 'email')));\r\n  if v_email is null or v_email = '' then\r\n    raise exception 'Auth email missing';\r\n  end if;\r\n\r\n  select i.id, i.email, i.status\r\n    into v_invite\r\n  from public.terreiro_invites i\r\n  where i.id = invite_id\r\n  for update;\r\n\r\n  if not found then\r\n    raise exception 'Invite not found';\r\n  end if;\r\n\r\n  if lower(trim(v_invite.email)) <> v_email then\r\n    raise exception 'Not authorized for this invite';\r\n  end if;\r\n\r\n  if v_invite.status <> 'pending' then\r\n    raise exception 'Invite is not pending';\r\n  end if;\r\n\r\n  update public.terreiro_invites\r\n     set status = 'rejected',\r\n         activated_at = now(),\r\n         activated_by = auth.uid()\r\n   where id = invite_id;\r\n\r\n  return jsonb_build_object('ok', true);\r\nend;\r\n"
        },
        {
          "routine_name": "reject_terreiro_membership_request",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_req record;\r\n  v_is_admin boolean;\r\nbegin\r\n  -- 1) Carregar pedido\r\n  select *\r\n    into v_req\r\n  from public.terreiro_membership_requests\r\n  where id = request_id;\r\n\r\n  if not found then\r\n    raise exception 'membership_request_not_found';\r\n  end if;\r\n\r\n  if v_req.status <> 'pending' then\r\n    raise exception 'membership_request_not_pending';\r\n  end if;\r\n\r\n  -- 2) Checar admin do terreiro\r\n  select exists (\r\n    select 1\r\n    from public.terreiro_members tm\r\n    where tm.terreiro_id = v_req.terreiro_id\r\n      and tm.user_id = auth.uid()\r\n      and tm.role = 'admin'\r\n      and tm.status = 'active'\r\n  )\r\n  into v_is_admin;\r\n\r\n  if not v_is_admin then\r\n    raise exception 'not_authorized_admin_only';\r\n  end if;\r\n\r\n  -- 3) Marcar request como rejected\r\n  update public.terreiro_membership_requests\r\n  set\r\n    status = 'rejected',\r\n    reviewed_at = now(),\r\n    reviewed_by = auth.uid(),\r\n    review_note = note\r\n  where id = request_id;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'request_id', v_req.id,\r\n    'status', 'rejected',\r\n    'terreiro_id', v_req.terreiro_id,\r\n    'user_id', v_req.user_id\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "reorder_collection_points",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\ndeclare\r\n  v_uid uuid := auth.uid();\r\n  v_is_allowed boolean;\r\n  v_count int;\r\n  v_min_pos int;\r\n  v_max_pos int;\r\n  v_distinct_pos int;\r\nbegin\r\n  if v_uid is null then\r\n    raise exception 'Not authenticated';\r\n  end if;\r\n\r\n  -- Permissão: owner_user_id OU admin/editor do terreiro dono\r\n  select exists (\r\n    select 1\r\n    from collections c\r\n    where c.id = p_collection_id\r\n      and (\r\n        c.owner_user_id = v_uid\r\n        or (\r\n          c.owner_terreiro_id is not null\r\n          and exists (\r\n            select 1\r\n            from terreiro_members tm\r\n            where tm.terreiro_id = c.owner_terreiro_id\r\n              and tm.user_id = v_uid\r\n              and tm.role = any (array['admin','editor'])\r\n          )\r\n        )\r\n      )\r\n  ) into v_is_allowed;\r\n\r\n  if not v_is_allowed then\r\n    raise exception 'Forbidden';\r\n  end if;\r\n\r\n  -- Validação do payload (positions precisam ser >=1 e únicas)\r\n  select\r\n    count(*)::int,\r\n    min((x.position)::int)::int,\r\n    max((x.position)::int)::int,\r\n    count(distinct (x.position)::int)::int\r\n  into v_count, v_min_pos, v_max_pos, v_distinct_pos\r\n  from jsonb_to_recordset(p_items) as x(ponto_id uuid, position int);\r\n\r\n  if v_count is null or v_count = 0 then\r\n    raise exception 'Empty payload';\r\n  end if;\r\n\r\n  if v_min_pos < 1 then\r\n    raise exception 'Invalid position: must be >= 1';\r\n  end if;\r\n\r\n  if v_distinct_pos <> v_count then\r\n    raise exception 'Duplicate positions in payload';\r\n  end if;\r\n\r\n  -- Opcional: exigir posições contíguas 1..N\r\n  if v_min_pos <> 1 or v_max_pos <> v_count then\r\n    raise exception 'Positions must be contiguous from 1..N';\r\n  end if;\r\n\r\n  -- Fase 1: offset para evitar colisão com UNIQUE(collection_id, position)\r\n  update collections_pontos\r\n  set position = position + 100000\r\n  where collection_id = p_collection_id;\r\n\r\n  -- Fase 2: aplica posições finais\r\n  update collections_pontos cp\r\n  set position = x.position\r\n  from jsonb_to_recordset(p_items) as x(ponto_id uuid, position int)\r\n  where cp.collection_id = p_collection_id\r\n    and cp.ponto_id = x.ponto_id;\r\n\r\n  get diagnostics v_count = row_count;\r\n\r\n  return jsonb_build_object(\r\n    'ok', true,\r\n    'updated_rows', v_count\r\n  );\r\nend;\r\n"
        },
        {
          "routine_name": "review_ponto_submission",
          "routine_type": "FUNCTION",
          "return_type": "jsonb",
          "routine_definition": "\r\n    declare\r\n      v_is_curator boolean;\r\n      v_sub record;\r\n      v_ponto_id uuid;\r\n\r\n      v_title text;\r\n      v_lyrics text;\r\n      v_tags text[];\r\n\r\n      v_author_name text;\r\n      v_interpreter_name text;\r\n      v_has_author_consent boolean;\r\n    begin\r\n      -- A verificação de curador ainda é importante para garantir que apenas curadores possam chamar esta função\r\n      select exists (select 1 from public.curators c where c.user_id = auth.uid())\r\n        into v_is_curator;\r\n\r\n      if not v_is_curator then\r\n        raise exception 'not_curator';\r\n      end if;\r\n\r\n      -- Agora, esta SELECT ignorará o RLS devido ao SECURITY DEFINER\r\n      select * into v_sub\r\n      from public.pontos_submissions\r\n      where id = p_submission_id\r\n      for update;\r\n\r\n      if not found then raise exception 'submission_not_found'; end if;\r\n      if v_sub.status <> 'pending' then raise exception 'submission_not_pending'; end if;\r\n      if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;\r\n\r\n      if p_decision = 'rejected' then\r\n        update public.pontos_submissions\r\n          set status = 'rejected',\r\n              reviewed_at = now(),\r\n              reviewed_by = auth.uid(),\r\n              review_note = p_review_note,\r\n              ponto_id = null\r\n        where id = p_submission_id;\r\n\r\n        -- PATCH: Se for rejeitado e tiver áudio, desativar o áudio\r\n        if v_sub.ponto_audio_id is not null then\r\n          update public.ponto_audios\r\n          set is_active = false\r\n          where id = v_sub.ponto_audio_id;\r\n        end if;\r\n\r\n        return jsonb_build_object('decision','rejected','submission_id',p_submission_id);\r\n      end if;\r\n\r\n      -- Se a decisão é 'approved'\r\n      v_title  := coalesce(p_title,  nullif(btrim(v_sub.payload->>'title'), ''));\r\n      v_lyrics := coalesce(p_lyrics, nullif(btrim(v_sub.payload->>'lyrics'), ''));\r\n      v_tags   := coalesce(p_tags,\r\n        case\r\n          when jsonb_typeof(v_sub.payload->'tags') = 'array'\r\n            then array(select jsonb_array_elements_text(v_sub.payload->'tags'))\r\n          else null\r\n        end\r\n      );\r\n\r\n      v_author_name := coalesce(p_author_name, v_sub.author_name, nullif(btrim(v_sub.payload->>'author_name'), ''));\r\n      v_interpreter_name := coalesce(p_interpreter_name, v_sub.interpreter_name, nullif(btrim(v_sub.payload->>'interpreter_name'), ''));\r\n\r\n      v_has_author_consent := coalesce(p_has_author_consent, v_sub.author_consent_granted);\r\n\r\n      if v_title is null then raise exception 'missing_title'; end if;\r\n      if v_lyrics is null then raise exception 'missing_lyrics'; end if;\r\n\r\n      -- se autor e intérprete diferentes, exige consentimento do autor\r\n      if v_author_name is not null and btrim(v_author_name) <> ''\r\n         and v_interpreter_name is not null and btrim(v_interpreter_name) <> ''\r\n         and lower(btrim(v_author_name)) <> lower(btrim(v_interpreter_name)) then\r\n        if v_has_author_consent is distinct from true then\r\n          raise exception 'missing_author_consent';\r\n        end if;\r\n      end if;\r\n\r\n      insert into public.pontos (\r\n        title,\r\n        lyrics,\r\n        tags,\r\n        created_by,\r\n        curated_by,\r\n        source_submission_id,\r\n        author_name,\r\n        is_public_domain\r\n      )\r\n      values (\r\n        v_title,\r\n        v_lyrics,\r\n        v_tags,\r\n        v_sub.created_by,\r\n        auth.uid(),\r\n        v_sub.id,\r\n        nullif(btrim(v_author_name), ''),\r\n        v_sub.ponto_is_public_domain\r\n      )\r\n      returning id into v_ponto_id;\r\n\r\n      -- 1) PRIMEIRO: marcar a submission como aprovada e vinculada ao ponto recém-criado\r\n      update public.pontos_submissions\r\n        set status = 'approved',\r\n            reviewed_at = now(),\r\n            reviewed_by = auth.uid(),\r\n            review_note = p_review_note,\r\n            ponto_id = v_ponto_id,\r\n            author_name = nullif(btrim(v_author_name), ''),\r\n            interpreter_name = nullif(btrim(v_interpreter_name), ''),\r\n            author_consent_granted = v_has_author_consent\r\n      where id = p_submission_id;\r\n\r\n      -- 2) SÓ DEPOIS: vincular e ativar o ponto_audio se existir\r\n      if v_sub.ponto_audio_id is not null then\r\n        -- desativar outros áudios para o mesmo ponto (se houver)\r\n        update public.ponto_audios\r\n        set is_active = false\r\n        where ponto_id = v_ponto_id\r\n          and id <> v_sub.ponto_audio_id;\r\n\r\n        -- vincular o áudio da submission ao ponto e ativá-lo\r\n        update public.ponto_audios\r\n        set\r\n          ponto_id = v_ponto_id,\r\n          is_active = true,\r\n          updated_at = now()\r\n        where id = v_sub.ponto_audio_id;\r\n      end if;\r\n\r\n      return jsonb_build_object(\r\n        'decision','approved',\r\n        'submission_id',p_submission_id,\r\n        'ponto_id',v_ponto_id\r\n      );\r\n    end;\r\n    "
        },
        {
          "routine_name": "search_pontos",
          "routine_type": "FUNCTION",
          "return_type": "record",
          "routine_definition": "\r\nDECLARE\r\n  q_norm text;\r\n  tsq    tsquery;\r\nBEGIN\r\n  q_norm := public.normalize_search_text(p_query);\r\n\r\n  IF q_norm IS NULL OR length(q_norm) = 0 THEN\r\n    RETURN;\r\n  END IF;\r\n\r\n  tsq := websearch_to_tsquery('simple', q_norm);\r\n\r\n  -- Busca principal por tsvector\r\n  RETURN QUERY\r\n  WITH ranked AS (\r\n    SELECT\r\n      p.id,\r\n      p.title,\r\n      p.tags,\r\n      pv.lyrics_preview_6,\r\n      (\r\n        ts_rank_cd(p.search_tsv, tsq)\r\n        + CASE\r\n            WHEN p.title_norm LIKE (q_norm || '%') THEN 2.0\r\n            WHEN p.title_norm LIKE ('%' || q_norm || '%') THEN 1.0\r\n            ELSE 0.0\r\n          END\r\n      )::real AS score\r\n    FROM public.pontos p\r\n    JOIN public.ponto_versoes pv\r\n      ON pv.ponto_id = p.id\r\n      AND pv.is_canonical = true\r\n    WHERE\r\n      p.is_active = true\r\n      AND p.restricted = false\r\n      AND p.search_tsv @@ tsq\r\n    ORDER BY score DESC, p.title ASC\r\n    LIMIT greatest(1, least(p_limit, 50))\r\n    OFFSET greatest(p_offset, 0)\r\n  )\r\n  SELECT * FROM ranked;\r\n\r\n  -- Fallback por ILIKE se tsvector não retornou nada\r\n  IF NOT FOUND THEN\r\n    RETURN QUERY\r\n    SELECT\r\n      p.id,\r\n      p.title,\r\n      p.tags,\r\n      pv.lyrics_preview_6,\r\n      (\r\n        CASE\r\n          WHEN p.title_norm LIKE (q_norm || '%') THEN 2.0\r\n          WHEN p.title_norm LIKE ('%' || q_norm || '%') THEN 1.0\r\n          WHEN p.search_text LIKE ('%' || q_norm || '%') THEN 0.5\r\n          ELSE 0.0\r\n        END\r\n      )::real AS score\r\n    FROM public.pontos p\r\n    JOIN public.ponto_versoes pv\r\n      ON pv.ponto_id = p.id\r\n      AND pv.is_canonical = true\r\n    WHERE\r\n      p.is_active = true\r\n      AND p.restricted = false\r\n      AND (\r\n        p.title_norm LIKE ('%' || q_norm || '%')\r\n        OR p.search_text LIKE ('%' || q_norm || '%')\r\n      )\r\n    ORDER BY score DESC, p.title ASC\r\n    LIMIT greatest(1, least(p_limit, 50))\r\n    OFFSET greatest(p_offset, 0);\r\n  END IF;\r\nEND;\r\n"
        },
        {
          "routine_name": "set_limit",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "set_ponto_audios_updated_at",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n"
        },
        {
          "routine_name": "set_updated_at",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "show_limit",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "show_trgm",
          "routine_type": "FUNCTION",
          "return_type": "ARRAY",
          "routine_definition": null
        },
        {
          "routine_name": "similarity",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "similarity_dist",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "similarity_op",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "strict_word_similarity",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "strict_word_similarity_commutator_op",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "strict_word_similarity_dist_commutator_op",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "strict_word_similarity_dist_op",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "strict_word_similarity_op",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "sync_profile_from_auth_users",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  v_full_name text;\r\n  v_avatar_url text;\r\n  v_provider text;\r\n  v_email_verified boolean;\r\nbegin\r\n  v_full_name := public._extract_full_name_from_auth_meta(new.raw_user_meta_data, new.email);\r\n  v_avatar_url := public._extract_avatar_from_auth_meta(new.raw_user_meta_data);\r\n\r\n  -- provider vem do raw_app_meta_data.provider\r\n  v_provider := nullif(new.raw_app_meta_data->>'provider', '');\r\n\r\n  -- email_verified vem do raw_user_meta_data.email_verified (pode vir boolean ou string)\r\n  v_email_verified :=\r\n    case\r\n      when new.raw_user_meta_data ? 'email_verified' then\r\n        (new.raw_user_meta_data->>'email_verified')::boolean\r\n      else\r\n        null\r\n    end;\r\n\r\n  insert into public.profiles (\r\n    id,\r\n    email,\r\n    full_name,\r\n    avatar_url,\r\n    auth_provider,\r\n    email_verified,\r\n    identity_updated_at,\r\n    created_at,\r\n    updated_at\r\n  )\r\n  values (\r\n    new.id,\r\n    new.email,\r\n    v_full_name,\r\n    v_avatar_url,\r\n    v_provider,\r\n    v_email_verified,\r\n    now(),\r\n    now(),\r\n    now()\r\n  )\r\n  on conflict (id) do update\r\n  set\r\n    email = excluded.email,\r\n    full_name = excluded.full_name,\r\n    avatar_url = excluded.avatar_url,\r\n    auth_provider = excluded.auth_provider,\r\n    email_verified = excluded.email_verified,\r\n    identity_updated_at = excluded.identity_updated_at,\r\n    updated_at = now();\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "tags_from_lyrics",
          "routine_type": "FUNCTION",
          "return_type": "ARRAY",
          "routine_definition": "\r\ndeclare\r\n  n text := public.normalize_text(input_lyrics);\r\n  out_tags text[] := '{}';\r\n  rec record;\r\n  v text;\r\n  pattern text;\r\nbegin\r\n  if n is null or n = '' then\r\n    return '{}';\r\n  end if;\r\n\r\n  for rec in\r\n    select key, canonical_tag, variants\r\n    from public.orixa_dictionary\r\n  loop\r\n    foreach v in array rec.variants loop\r\n      -- boundary aproximado por não-alfanumérico/underscore\r\n      pattern := '(^|[^a-z0-9_])' || public.normalize_text(v) || '([^a-z0-9_]|$)';\r\n      if n ~ pattern then\r\n        if not (rec.canonical_tag = any(out_tags)) then\r\n          out_tags := array_append(out_tags, rec.canonical_tag);\r\n        end if;\r\n        exit;\r\n      end if;\r\n    end loop;\r\n  end loop;\r\n\r\n  return out_tags;\r\nend;\r\n"
        },
        {
          "routine_name": "tg_set_tag_text_normalized",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nbegin\r\n  new.tag_text_normalized := public.normalize_tag_text(new.tag_text);\r\n\r\n  if new.tag_text_normalized is null then\r\n    raise exception 'tag_text_normalized cannot be null (tag_text=%)', new.tag_text;\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "trg_collections_pontos_validate_versao",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nBEGIN\r\n  IF NEW.ponto_versao_id IS NOT NULL THEN\r\n    IF NOT EXISTS (\r\n      SELECT 1 FROM public.ponto_versoes pv\r\n      WHERE pv.id = NEW.ponto_versao_id\r\n        AND pv.ponto_id = NEW.ponto_id\r\n    ) THEN\r\n      RAISE EXCEPTION 'ponto_versao_id % não pertence ao ponto_id %',\r\n        NEW.ponto_versao_id, NEW.ponto_id;\r\n    END IF;\r\n  END IF;\r\n  RETURN NEW;\r\nEND;\r\n"
        },
        {
          "routine_name": "trg_ponto_versoes_refresh_derived",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nBEGIN\r\n  NEW.lyrics_preview_6 :=\r\n    coalesce(\r\n      array_to_string(\r\n        (regexp_split_to_array(coalesce(NEW.lyrics, ''), E'\\\\r?\\\\n'))[1:6],\r\n        E'\\n'\r\n      ),\r\n      ''\r\n    );\r\n\r\n  NEW.title_norm := lower(unaccent(coalesce(NEW.title, '')));\r\n\r\n  NEW.search_tsv :=\r\n    to_tsvector(\r\n      'simple',\r\n      lower(unaccent(coalesce(NEW.title, ''))) || ' ' ||\r\n      lower(unaccent(coalesce(NEW.lyrics, ''))) || ' ' ||\r\n      lower(unaccent(coalesce(array_to_string(NEW.tags, ' '), '')))\r\n    );\r\n\r\n  RETURN NEW;\r\nEND;\r\n"
        },
        {
          "routine_name": "trg_ponto_versoes_set_versao_num",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nBEGIN\r\n  IF NEW.versao_num IS NULL THEN\r\n    PERFORM pg_advisory_xact_lock(\r\n      hashtextextended(NEW.ponto_id::text, 0)\r\n    );\r\n    SELECT COALESCE(MAX(versao_num), 0) + 1\r\n      INTO NEW.versao_num\r\n    FROM public.ponto_versoes\r\n    WHERE ponto_id = NEW.ponto_id;\r\n  END IF;\r\n  RETURN NEW;\r\nEND;\r\n"
        },
        {
          "routine_name": "trg_pontos_refresh_derived_fields",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  v_tags_text text;\r\n  v_preview text;\r\nbegin\r\n  -- preview de até 6 linhas\r\n  v_preview :=\r\n    coalesce(\r\n      array_to_string(\r\n        (regexp_split_to_array(coalesce(new.lyrics, ''), E'\\\\r?\\\\n'))[1:6],\r\n        E'\\n'\r\n      ),\r\n      ''\r\n    );\r\n\r\n  new.lyrics_preview_6 := v_preview;\r\n\r\n  -- tags como texto\r\n  v_tags_text := array_to_string(coalesce(new.tags, '{}'), ' ');\r\n\r\n  -- normalização simples (lower + unaccent)\r\n  new.title_norm := lower(unaccent(coalesce(new.title, '')));\r\n\r\n  -- tsvector para busca (title + lyrics + tags)\r\n  new.search_tsv :=\r\n    to_tsvector(\r\n      'simple',\r\n      lower(unaccent(coalesce(new.title, ''))) || ' ' ||\r\n      lower(unaccent(coalesce(new.lyrics, ''))) || ' ' ||\r\n      lower(unaccent(coalesce(v_tags_text, '')))\r\n    );\r\n\r\n  return new;\r\nend;\r\n"
        },
        {
          "routine_name": "trg_prevent_last_admin_change",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\ndeclare\r\n  v_other_admins_count int;\r\n  v_is_admin_row boolean;\r\n  v_is_active_row boolean;\r\n  v_is_admin_after boolean;\r\n  v_is_active_after boolean;\r\nbegin\r\n  -- BYPASS: durante deleção de terreiro, permitir remover o último admin via CASCADE\r\n  if current_setting('app.deleting_terreiro', true) = 'on' then\r\n    if tg_op = 'DELETE' then\r\n      return old;\r\n    else\r\n      return new;\r\n    end if;\r\n  end if;\r\n\r\n  -- Determina se a linha atual (OLD) representa um admin ativo\r\n  v_is_admin_row := (coalesce(old.role, '') = 'admin');\r\n  v_is_active_row := (coalesce(old.status, 'active') = 'active');\r\n\r\n  -- Só nos importamos com a regra \"último admin\" quando a linha é admin ativo\r\n  if not (v_is_admin_row and v_is_active_row) then\r\n    if tg_op = 'DELETE' then\r\n      return old;\r\n    else\r\n      return new;\r\n    end if;\r\n  end if;\r\n\r\n  -- Para UPDATE, checa se depois da alteração a linha deixa de ser admin ativo\r\n  if tg_op = 'UPDATE' then\r\n    v_is_admin_after := (coalesce(new.role, '') = 'admin');\r\n    v_is_active_after := (coalesce(new.status, 'active') = 'active');\r\n\r\n    -- Se continuar admin ativo, não está removendo privilégio de admin\r\n    if v_is_admin_after and v_is_active_after then\r\n      return new;\r\n    end if;\r\n  end if;\r\n\r\n  -- Conta quantos admins ativos restariam, excluindo a própria linha (OLD)\r\n  select count(*) into v_other_admins_count\r\n  from public.terreiro_members tm\r\n  where tm.terreiro_id = old.terreiro_id\r\n    and tm.user_id <> old.user_id\r\n    and tm.role = 'admin'\r\n    and coalesce(tm.status, 'active') = 'active';\r\n\r\n  if v_other_admins_count <= 0 then\r\n    raise exception 'cannot_remove_last_admin';\r\n  end if;\r\n\r\n  if tg_op = 'DELETE' then\r\n    return old;\r\n  else\r\n    return new;\r\n  end if;\r\nend;\r\n"
        },
        {
          "routine_name": "trg_sync_ponto_search_from_canonical_versao",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\r\nBEGIN\r\n  IF (TG_OP = 'DELETE' AND OLD.is_canonical = true)\r\n     OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.is_canonical = true) THEN\r\n\r\n    UPDATE public.pontos p\r\n    SET\r\n      search_tsv = to_tsvector(\r\n        'simple',\r\n        lower(unaccent(coalesce(p.title, ''))) || ' ' ||\r\n        lower(unaccent(coalesce(NEW.lyrics, ''))) || ' ' ||\r\n        lower(unaccent(coalesce(array_to_string(p.tags, ' '), ''))) || ' ' ||\r\n        lower(unaccent(coalesce(array_to_string(NEW.tags, ' '), '')))\r\n      ),\r\n      title_norm = lower(unaccent(coalesce(p.title, ''))),\r\n      updated_at = now()\r\n    WHERE p.id = NEW.ponto_id;\r\n\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n"
        },
        {
          "routine_name": "unaccent",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": null
        },
        {
          "routine_name": "unaccent",
          "routine_type": "FUNCTION",
          "return_type": "text",
          "routine_definition": null
        },
        {
          "routine_name": "unaccent_init",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "unaccent_lexize",
          "routine_type": "FUNCTION",
          "return_type": "internal",
          "routine_definition": null
        },
        {
          "routine_name": "update_updated_at_column",
          "routine_type": "FUNCTION",
          "return_type": "trigger",
          "routine_definition": "\nBEGIN\n  NEW.updated_at = now();\n  RETURN NEW;\nEND;\n"
        },
        {
          "routine_name": "word_similarity",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "word_similarity_commutator_op",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        },
        {
          "routine_name": "word_similarity_dist_commutator_op",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "word_similarity_dist_op",
          "routine_type": "FUNCTION",
          "return_type": "real",
          "routine_definition": null
        },
        {
          "routine_name": "word_similarity_op",
          "routine_type": "FUNCTION",
          "return_type": "boolean",
          "routine_definition": null
        }
      ],
      "triggers": [
        {
          "trigger_name": "trg_collections_pontos_set_defaults",
          "event_manipulation": "INSERT",
          "event_object_table": "collections_pontos",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION collections_pontos_set_defaults()"
        },
        {
          "trigger_name": "trg_collections_pontos_validate_versao",
          "event_manipulation": "UPDATE",
          "event_object_table": "collections_pontos",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_collections_pontos_validate_versao()"
        },
        {
          "trigger_name": "trg_collections_pontos_validate_versao",
          "event_manipulation": "INSERT",
          "event_object_table": "collections_pontos",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_collections_pontos_validate_versao()"
        },
        {
          "trigger_name": "trg_on_curator_revoked_disable_mode",
          "event_manipulation": "DELETE",
          "event_object_table": "curators",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION on_curator_revoked_disable_mode()"
        },
        {
          "trigger_name": "trg_guard_ponto_audio_set_active",
          "event_manipulation": "UPDATE",
          "event_object_table": "ponto_audios",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION guard_ponto_audio_set_active_requires_approved_submission()"
        },
        {
          "trigger_name": "trg_guard_ponto_audio_set_active",
          "event_manipulation": "INSERT",
          "event_object_table": "ponto_audios",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION guard_ponto_audio_set_active_requires_approved_submission()"
        },
        {
          "trigger_name": "trg_ponto_audios_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "ponto_audios",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_ponto_audios_updated_at()"
        },
        {
          "trigger_name": "trg_ponto_versoes_refresh_derived",
          "event_manipulation": "UPDATE",
          "event_object_table": "ponto_versoes",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_ponto_versoes_refresh_derived()"
        },
        {
          "trigger_name": "trg_ponto_versoes_refresh_derived",
          "event_manipulation": "INSERT",
          "event_object_table": "ponto_versoes",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_ponto_versoes_refresh_derived()"
        },
        {
          "trigger_name": "trg_ponto_versoes_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "ponto_versoes",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        },
        {
          "trigger_name": "trg_ponto_versoes_set_versao_num",
          "event_manipulation": "INSERT",
          "event_object_table": "ponto_versoes",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_ponto_versoes_set_versao_num()"
        },
        {
          "trigger_name": "trg_sync_ponto_search_from_canonical_versao",
          "event_manipulation": "UPDATE",
          "event_object_table": "ponto_versoes",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION trg_sync_ponto_search_from_canonical_versao()"
        },
        {
          "trigger_name": "trg_sync_ponto_search_from_canonical_versao",
          "event_manipulation": "INSERT",
          "event_object_table": "ponto_versoes",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION trg_sync_ponto_search_from_canonical_versao()"
        },
        {
          "trigger_name": "trg_enforce_audio_duration_on_approval",
          "event_manipulation": "UPDATE",
          "event_object_table": "pontos_submissions",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION enforce_audio_duration_on_approval()"
        },
        {
          "trigger_name": "profiles_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "profiles",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        },
        {
          "trigger_name": "trg_profiles_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "profiles",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        },
        {
          "trigger_name": "trg_block_delete_public_app_config",
          "event_manipulation": "DELETE",
          "event_object_table": "public_app_config",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION block_delete_public_app_config()"
        },
        {
          "trigger_name": "trg_public_app_config_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "public_app_config",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        },
        {
          "trigger_name": "trg_normalize_email_invites",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiro_invites",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION fn_normalize_email()"
        },
        {
          "trigger_name": "trg_normalize_email_invites",
          "event_manipulation": "INSERT",
          "event_object_table": "terreiro_invites",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION fn_normalize_email()"
        },
        {
          "trigger_name": "prevent_last_admin_delete",
          "event_manipulation": "DELETE",
          "event_object_table": "terreiro_members",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_prevent_last_admin_change()"
        },
        {
          "trigger_name": "prevent_last_admin_update",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiro_members",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION trg_prevent_last_admin_change()"
        },
        {
          "trigger_name": "trg_custom_tags_refresh_ponto",
          "event_manipulation": "DELETE",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION on_custom_tag_changed_refresh_ponto()"
        },
        {
          "trigger_name": "trg_custom_tags_refresh_ponto",
          "event_manipulation": "INSERT",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION on_custom_tag_changed_refresh_ponto()"
        },
        {
          "trigger_name": "trg_custom_tags_refresh_ponto",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "AFTER",
          "action_statement": "EXECUTE FUNCTION on_custom_tag_changed_refresh_ponto()"
        },
        {
          "trigger_name": "trg_set_tag_text_normalized",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION tg_set_tag_text_normalized()"
        },
        {
          "trigger_name": "trg_set_tag_text_normalized",
          "event_manipulation": "INSERT",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION tg_set_tag_text_normalized()"
        },
        {
          "trigger_name": "trg_tpc_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiro_ponto_custom_tags",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        },
        {
          "trigger_name": "trg_terreiros_set_updated_at",
          "event_manipulation": "UPDATE",
          "event_object_table": "terreiros",
          "action_timing": "BEFORE",
          "action_statement": "EXECUTE FUNCTION set_updated_at()"
        }
      ],
      "enums": [
        {
          "enum_name": "audio_upload_status",
          "enum_value": "pending",
          "enumsortorder": 1
        },
        {
          "enum_name": "audio_upload_status",
          "enum_value": "uploaded",
          "enumsortorder": 2
        },
        {
          "enum_name": "audio_upload_status",
          "enum_value": "failed",
          "enumsortorder": 3
        },
        {
          "enum_name": "audio_upload_status",
          "enum_value": "deleted",
          "enumsortorder": 4
        },
        {
          "enum_name": "collection_visibility",
          "enum_value": "public",
          "enumsortorder": 1
        },
        {
          "enum_name": "collection_visibility",
          "enum_value": "private",
          "enumsortorder": 2
        },
        {
          "enum_name": "collection_visibility",
          "enum_value": "members",
          "enumsortorder": 3
        },
        {
          "enum_name": "consent_party_role",
          "enum_value": "author",
          "enumsortorder": 1
        },
        {
          "enum_name": "consent_party_role",
          "enum_value": "interpreter",
          "enumsortorder": 2
        },
        {
          "enum_name": "consent_status",
          "enum_value": "granted",
          "enumsortorder": 1
        },
        {
          "enum_name": "consent_status",
          "enum_value": "denied",
          "enumsortorder": 2
        },
        {
          "enum_name": "consent_status",
          "enum_value": "unknown",
          "enumsortorder": 3
        },
        {
          "enum_name": "consent_status",
          "enum_value": "revoked",
          "enumsortorder": 4
        },
        {
          "enum_name": "consent_subject_type",
          "enum_value": "ponto",
          "enumsortorder": 1
        },
        {
          "enum_name": "consent_subject_type",
          "enum_value": "ponto_audio",
          "enumsortorder": 2
        },
        {
          "enum_name": "curator_invite_status",
          "enum_value": "pending",
          "enumsortorder": 1
        },
        {
          "enum_name": "curator_invite_status",
          "enum_value": "accepted",
          "enumsortorder": 2
        },
        {
          "enum_name": "curator_invite_status",
          "enum_value": "rejected",
          "enumsortorder": 3
        },
        {
          "enum_name": "curator_invite_status",
          "enum_value": "cancelled",
          "enumsortorder": 4
        },
        {
          "enum_name": "curator_invite_status",
          "enum_value": "expired",
          "enumsortorder": 5
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Orixá",
          "enumsortorder": 1
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Caboclo",
          "enumsortorder": 2
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Cabocla",
          "enumsortorder": 3
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Preto Velho",
          "enumsortorder": 4
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Preta Velha",
          "enumsortorder": 5
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Exu",
          "enumsortorder": 6
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Pombagira",
          "enumsortorder": 7
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Erê",
          "enumsortorder": 8
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Marinheiro",
          "enumsortorder": 9
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Boiadeiro",
          "enumsortorder": 10
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Cigano",
          "enumsortorder": 11
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Baiano",
          "enumsortorder": 12
        },
        {
          "enum_name": "entidade_linha",
          "enum_value": "Outro",
          "enumsortorder": 13
        },
        {
          "enum_name": "ponto_submission_kind",
          "enum_value": "new",
          "enumsortorder": 1
        },
        {
          "enum_name": "ponto_submission_kind",
          "enum_value": "correction",
          "enumsortorder": 2
        },
        {
          "enum_name": "ponto_submission_kind",
          "enum_value": "issue",
          "enumsortorder": 3
        },
        {
          "enum_name": "ponto_submission_kind",
          "enum_value": "audio_upload",
          "enumsortorder": 4
        },
        {
          "enum_name": "ponto_submission_kind",
          "enum_value": "variation",
          "enumsortorder": 5
        },
        {
          "enum_name": "ponto_submission_status",
          "enum_value": "pending",
          "enumsortorder": 1
        },
        {
          "enum_name": "ponto_submission_status",
          "enum_value": "approved",
          "enumsortorder": 2
        },
        {
          "enum_name": "ponto_submission_status",
          "enum_value": "rejected",
          "enumsortorder": 3
        },
        {
          "enum_name": "terreiro_membership_request_status",
          "enum_value": "pending",
          "enumsortorder": 1
        },
        {
          "enum_name": "terreiro_membership_request_status",
          "enum_value": "approved",
          "enumsortorder": 2
        },
        {
          "enum_name": "terreiro_membership_request_status",
          "enum_value": "rejected",
          "enumsortorder": 3
        },
        {
          "enum_name": "terreiro_membership_request_status",
          "enum_value": "cancelled",
          "enumsortorder": 4
        }
      ]
    }
  }
]