# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
pnpm dev            # Start Convex + Vite dev servers (http://localhost:5173)
pnpm dev:vite       # Start Vite dev server only
pnpm dev:convex     # Start Convex dev server + Vite concurrently
pnpm build          # Deploy Convex and build for production
pnpm lint           # Run TypeScript check + ESLint
```

### Convex CLI

```bash
npx convex dev              # Start dev server (syncs functions, generates types)
npx convex deploy           # Deploy to production
npx convex codegen          # Regenerate TypeScript types
npx convex env set KEY val  # Set environment variable
npx convex logs             # View function logs
```

## Architecture

**Stack:** Vite + React 19 + React Router + Tailwind CSS v4 + Convex

**Key Files:**

- `src/lib/convex.ts` - Convex client setup (exports `convex` client)
- `src/lib/auth-client.ts` - Better Auth client setup
- `src/main.tsx` - App entry with ConvexProvider wrapper
- `src/router.tsx` - Router configuration (add new routes here)
- `src/pages/Home.tsx` - Home page
- `convex/schema.ts` - Database schema definition
- `convex/auth.ts` - Better Auth server configuration
- `convex/http.ts` - HTTP router (registers auth routes)
- `convex/email.ts` - Email service (Resend)
- `convex/` - Backend functions (queries, mutations, actions)

**Environment Variables** (in `.env.local`):

- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOY_KEY` - Convex Deploy Key (for non-interactive CLI operations)

**Auth environment variables** (set via `npx convex env set`): See README.md for Better Auth setup including `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL`, and `SITE_URL`.

**API keys:** Do not expose API keys to the browser. Use Convex environment variables for server-side secrets (`npx convex env set KEY val`).

---

## Path Aliases

This template uses `@/` as an alias for `src/`. Example:

```typescript
import { convex } from "@/lib/convex";
import Home from "@/pages/Home";
```

**Case-sensitive imports:** WebContainers and Linux filesystems are case-sensitive. Keep import casing aligned with filenames (e.g., `checkbox.tsx` vs `Checkbox.tsx`) to avoid Vite resolution errors.

---

## React Integration

```typescript
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

// Queries - real-time, auto-updates (returns undefined while loading)
const tasks = useQuery(api.tasks.list);
const userTasks = useQuery(api.tasks.getByUser, { userId: "user123" });

// Mutations - for database writes
const createTask = useMutation(api.tasks.create);
await createTask({ text: "New task" });

// Actions - for side effects
const sendEmail = useAction(api.actions.sendEmail);

// Skip query conditionally
const tasks = useQuery(api.tasks.getByUser, userId ? { userId } : "skip");
```

---

## Type Generation

Types are auto-generated in `convex/_generated/` after running `npx convex dev`.

**Always regenerate types after schema changes:**

```bash
npx convex codegen  # Manual regeneration
```

Import types:

```typescript
import { Id, Doc } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";

// Use generated types
type Task = Doc<"tasks">;
type TaskId = Id<"tasks">;
```

---

## Environment Variables

### Client-side (browser)
Variables prefixed with `VITE_` are exposed to the browser:
- `VITE_CONVEX_URL` - Convex deployment URL

### Server-side (Convex functions)
Set via CLI, never exposed to browser:
```bash
npx convex env set API_KEY "your-secret-key"
npx convex env list
npx convex env unset API_KEY
```

Access in functions:
```typescript
const apiKey = process.env.API_KEY;
```

---

## Convex Guidelines

### Function Guidelines
#### New function syntax
- ALWAYS use the new function syntax for Convex functions. For example:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
    // Function body
    },
});
```

#### Http endpoint syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
    }),
});
```
- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.

#### Validators
- Use `v.null()` for functions that return nothing (not `undefined`)
- Convex types and validators:
Convex Type  | TS/JS type  |  Example Usage         | Validator for argument validation and schemas  | Notes                                                                                                                                                                                                 |
| ----------- | ------------| -----------------------| -----------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Id          | string      | `doc._id`              | `v.id(tableName)`                              |                                                                                                                                                                                                       |
| Null        | null        | `null`                 | `v.null()`                                     | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead.                             |
| Int64       | bigint      | `3n`                   | `v.int64()`                                    | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers.                                                                                              |
| Float64     | number      | `3.1`                  | `v.number()`                                   | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings.                                                                      |
| Boolean     | boolean     | `true`                 | `v.boolean()`                                  |
| String      | string      | `"abc"`                | `v.string()`                                   | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8.                                                         |
| Bytes       | ArrayBuffer | `new ArrayBuffer(8)`   | `v.bytes()`                                    | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types.                                                     |
| Array       | Array       | `[1, 3.2, "abc"]`      | `v.array(values)`                              | Arrays can have at most 8192 values.                                                                                                                                                                  |
| Object      | Object      | `{a: "abc"}`           | `v.object({property: value})`                  | Convex only supports "plain old JavaScript objects" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with "$" or "_". |
| Record      | Record      | `{"a": "1", "b": "2"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with "$" or "_".                                                               |

#### Function registration
- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.
- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument and return validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`. If a function doesn't return anything, include `returns: v.null()` as its output validator.
- If the JavaScript implementation of a Convex function doesn't have a return value, it implicitly returns `null`.

#### Function calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action.
- Use `ctx.runMutation` to call a mutation from a mutation or action.
- Use `ctx.runAction` to call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.
- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.
- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.
- When calling a function in the same file, add a type annotation to avoid TypeScript circularity: `const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });`

#### Function references
- Function references are pointers to registered Convex functions.
- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.
- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.
- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.
- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.
- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.

#### Api design
- Convex uses file-based routing, so thoughtfully organize files with public query, mutation, or action functions within the `convex/` directory.
- Use `query`, `mutation`, and `action` to define public functions.
- Use `internalQuery`, `internalMutation`, and `internalAction` to define private, internal functions.

#### Pagination
- Use `paginationOptsValidator` from `convex/server` for paginated queries
- `.paginate(paginationOpts)` returns `{ page, isDone, continueCursor }`
```ts
import { paginationOptsValidator } from "convex/server";
const results = await ctx.db.query("messages")
  .withIndex("by_author", (q) => q.eq("author", args.author))
  .order("desc")
  .paginate(args.paginationOpts);
```


### Validator guidelines
- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

### Schema guidelines
- Always define your schema in `convex/schema.ts`.
- Always import the schema definition functions from `convex/server`.
- System fields are automatically added to all documents and are prefixed with an underscore. The two system fields that are automatically added to all documents are `_creationTime` which has the validator `v.number()` and `_id` which has the validator `v.id(tableName)`.
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
- Index fields must be queried in the same order they are defined. If you want to be able to query by "field1" then "field2" and by "field2" then "field1", you must create separate indexes.

### Typescript guidelines
- Use `Id<"tableName">` for document IDs (not `string`): `import { Id } from "./_generated/dataModel"`
- Use `Doc<"tableName">` for full document types
- For records: `v.record(v.id("users"), v.string())` → `Record<Id<"users">, string>`
- Use `as const` for string literals in discriminated unions
- Add `@types/node` to `package.json` when using Node.js built-in modules

### Full text search guidelines
- A query for "10 messages in channel '#general' that best match the query 'hello hi' in their body" would look like:

const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);

### Query guidelines
- Do NOT use `filter` in queries. `filter` loops through every document in the table, which is slow and expensive. Instead, define an index in the schema and use `withIndex`, which leverages database indexes for efficient lookups.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.
#### Ordering
- By default Convex always returns documents in ascending `_creationTime` order.
- You can use `.order('asc')` or `.order('desc')` to pick whether a query is in ascending or descending order. If the order isn't specified, it defaults to ascending.
- Document queries that use indexes will be ordered based on the columns in the index and can avoid slow table scans.


### Mutation guidelines
- Use `ctx.db.replace` to fully replace an existing document. This method will throw an error if the document does not exist.
- Use `ctx.db.patch` to shallow merge updates into an existing document. This method will throw an error if the document does not exist.

### Action guidelines
- Add `"use node";` at top of files using Node.js built-in modules
- Actions cannot access `ctx.db` - use `ctx.runQuery`/`ctx.runMutation` instead

### Scheduling guidelines
- Use `crons.interval` or `crons.cron` only (not `crons.hourly`, `crons.daily`, `crons.weekly`)
- Always import `internal` from `_generated/api` for internal function references
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("cleanup", { hours: 2 }, internal.tasks.cleanup, {});
export default crons;
```


### File storage guidelines
- `ctx.storage.getUrl(fileId)` returns a signed URL (or `null` if not found)
- Get file metadata via `ctx.db.system.get(fileId)` (not the deprecated `ctx.storage.getMetadata`)
- Files are stored as `Blob` objects

---

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Schema Reference](https://docs.convex.dev/database/schemas)
- [Functions Guide](https://docs.convex.dev/functions)
- [React Hooks Reference](https://docs.convex.dev/client/react)
- [CLI Reference](https://docs.convex.dev/cli)
