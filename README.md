# local-ledger

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Database

Local Ledger uses better-sqlite3 for database operations, providing a lightweight and efficient way to store transaction and category data. 

### Key Database Features
- Simple SQLite-based storage with high performance
- Direct query access without complex ORM abstractions
- Reliable Electron integration through the main process
- Automatic database initialization and migration

All database operations are handled through IPC communication between the renderer process (UI) and the main process (database access).
