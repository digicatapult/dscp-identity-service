# Database usage

`vitalam-identity-service` is backed by a PostgreSQL database and is the canonical record of the readings recorded in a `VITALam` instance.

## Database migrations

Database migrations are handled using [`knex.js`](https://knexjs.org/) and can be migrated manually using the following commands:

```sh
npx knex migrate:latest # used to migrate to latest database version
npx knex migrate:up # used to migrate to the next database version
npx knex migrate:down # used to migrate to the previous database version
```

## Table structure

The following tables exist in the `vitalam` database.

### `members`

`members` represent the on-chain member identities, and provides storage for aliases to be stored when optionally selected to do so.

#### Columns

| column          | PostgreSQL type           | nullable |       default        | description                         |
|:----------------| :------------------------ | :------- | :------------------: |:------------------------------------|
| `id`            | `UUID`                    | FALSE    | `uuid_generate_v4()` | Unique identifier for the `dataset` |
| `address`       | `CHARACTER VARYING (50)`  | FALSE    |          -           | The address of the member           |
| `alias`         | `CHARACTER VARYING (50)`  | FALSE    |          -           | A friendly name for the member      |
| `created_at`    | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was first created      |
| `updated_at`    | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was last updated       |

#### Indexes

| columns            | Index Type | description                                                                         |
|:-------------------|:-----------|:------------------------------------------------------------------------------------|
| `id`               | PRIMARY    | Primary key                                                                         |
| `alias`            | Index      | Allows quick filtering of `members` by `alias` name                                 |
| `address`, `alias` | Unique     | Prevents more than one `member` from being created with identical characterisations |
