# Deployment Guide — Bakery Profitability Analysis (PHP Edition)

This is the PHP + vanilla JavaScript port of the Profitability Analysis tool, built for
standard shared/cPanel-style hosting. **No Node.js runtime is required at any point after
deployment** — the app is upload-and-run.

Everything lives under the `profitability/` folder. That folder is the deployable unit:
upload it (or the whole repo) to your hosting account and open:

```
https://yourdomain.com/profitability/index.php
```

---

## 1. Requirements

### PHP version
- **PHP 8.1 or newer** (tested on 8.1–8.4). This is a hard requirement of the bundled
  `phpoffice/phpspreadsheet` ^3.0 dependency.

### Required PHP extensions
Enable these in `php.ini` (most shared hosts have them on by default — check your
hosting control panel's "PHP Extensions" / "Select PHP Version" screen):

| Extension | Used for |
|---|---|
| `pdo` | Database access layer |
| `pdo_sqlite` | SQLite database driver |
| `sqlite3` | SQLite (PhpSpreadsheet/PDO backing) |
| `zip` | Reading `.xlsx` files (they are ZIP/OOXML archives) |
| `xml`, `xmlreader`, `xmlwriter`, `simplexml`, `dom`, `libxml` | Parsing the XML inside `.xlsx` |
| `mbstring` | Multi-byte-safe string handling (account names, outlet names) |
| `gd` | Image handling used internally by PhpSpreadsheet |
| `fileinfo` | File type detection |
| `ctype`, `iconv`, `zlib` | PhpSpreadsheet internals |

On cPanel: **MultiPHP INI Editor** or **Select PHP Version → Extensions** is where you
toggle these on. Most are enabled by default on modern hosting stacks.

### Composer / PhpSpreadsheet dependency
The `vendor/` folder (containing `phpoffice/phpspreadsheet` and its small set of
dependencies, ~8.5MB, stripped of tests/docs/samples) is **already committed** under
`profitability/vendor/` — you do not need Composer on the server to get started.

If you do want to regenerate it yourself (e.g. to pick up a newer PhpSpreadsheet patch
release), from inside `profitability/`:

```bash
composer install --no-dev --optimize-autoloader
```

`profitability/composer.json` pins `phpoffice/phpspreadsheet: ^3.0`, which is the last
major line that supports PHP 8.1. Do not bump to PhpSpreadsheet 5.x unless you also raise
the server's minimum PHP version — 5.x requires PHP 8.2+/8.3+.

### SQLite requirements
No database server to install or configure. The app creates a single SQLite file at
`profitability/storage/data/app.sqlite` on first request (schema is created
automatically). You only need `pdo_sqlite` enabled (see above) and a **writable
`storage/` directory** (see next section).

---

## 2. Folder permissions

The web server user (`www-data`, `nobody`, or your cPanel account's PHP user) must be
able to **write** to:

```
profitability/storage/            (and everything under it)
profitability/storage/data/       ← SQLite database file lives here
profitability/storage/uploads/    ← reserved for future use, currently unused at runtime
```

Recommended permissions after upload:

```bash
chmod -R 755 profitability
chmod -R 775 profitability/storage
```

If your host runs PHP as a different user than the file owner (common on shared
hosting with suEXEC/CGI), you may need `chmod -R 777 profitability/storage` instead —
try 775 first, only widen it if you get a "database is locked" or "unable to open
database file" error.

`profitability/storage/.htaccess` (and `lib/.htaccess`, `vendor/.htaccess`) already
block direct web access to those folders on Apache (`Require all denied`). This is
important: `storage/data/app.sqlite` contains your uploaded financial data and must
never be directly downloadable. If you are on **Nginx or LiteSpeed**, `.htaccess` is
ignored — add an equivalent rule yourself, e.g. for Nginx:

```nginx
location ~ ^/profitability/(storage|lib|vendor)/ {
    deny all;
    return 404;
}
```

---

## 3. php.ini recommendations

Upload processing (parsing a real multi-sheet, multi-year Excel workbook) is the
heaviest thing this app does. Shared-hosting defaults are usually too low. Set these
either in your hosting control panel's PHP settings screen, in a custom `php.ini` /
`.user.ini` in the `profitability/` folder, or ask your host to raise them:

| Setting | Recommended | Why |
|---|---|---|
| `file_uploads` | `On` | Required — obviously. |
| `upload_max_filesize` | `30M` | Must be ≥ the app's own 25MB per-file cap, with headroom. |
| `post_max_size` | `32M` | Must be **larger** than `upload_max_filesize` (PHP silently drops the whole POST otherwise). Each bulk-upload file is sent as its own HTTP request — this does **not** need to cover the whole batch, only one file at a time. |
| `max_execution_time` | `180` (seconds) | A 99-sheet, multi-year workbook like the pilot file took ~5–7s to parse in testing; give generous headroom for larger or slower-disk hosts. |
| `max_input_time` | `180` | Same reasoning — covers the upload transfer phase. |
| `memory_limit` | `256M` minimum, `512M` if your outlets' workbooks are large | See benchmark below. |

Example `.user.ini` (place inside `profitability/`, works on most PHP-FPM shared hosts
without needing root/SSH access — takes effect within a few minutes):

```ini
upload_max_filesize = 30M
post_max_size = 32M
max_execution_time = 180
max_input_time = 180
memory_limit = 512M
```

If `.user.ini` has no effect on your host, use the cPanel "MultiPHP INI Editor" instead
— it edits the equivalent settings directly.

### Memory benchmark (for the "large 50–100 sheet" requirement)

The real pilot workbook (99 sheets, ~8 years of monthly ledgers, formulas, multiple
years of Petty Cash / GL / Transaksi Online tabs) peaked at **~144MB** of PHP memory
during a full scan-and-parse in testing on PHP 8.4. Recommendations:

- **512MB memory_limit** comfortably covers workbooks similar to or larger than the
  pilot file (up to roughly double its sheet/row count).
- The Excel reader is configured with `setReadDataOnly(true)`, which skips cell
  styling/formatting entirely — this is what keeps memory and parse time down; do not
  remove this setting.
- Formula cells are read via their **cached last-saved value** (`getOldCalculatedValue()`),
  not re-evaluated with PhpSpreadsheet's own calculation engine — this is both faster
  and avoids formula-engine-compatibility edge cases across hundreds of formulas.
- If you routinely process workbooks meaningfully larger than the pilot file (e.g.
  200+ sheets or GL sheets with tens of thousands of rows), raise `memory_limit`
  further (1024M) and `max_execution_time` accordingly, or ask your host about a
  dedicated PHP worker with higher limits for this one application.
- Because the bulk-upload flow sends **one file per HTTP request** (see below), memory
  and time limits only ever need to cover a single workbook, not the whole batch.

---

## 4. Bulk upload architecture (why the limits above are enough)

The "select 10+ files, Process All" flow in `upload.php` does **not** send all files in
one request. The browser-side JavaScript (`assets/js/upload.js`) uploads and processes
files **sequentially, one `POST /profitability/api/upload.php` request per file**, updating
each file's status badge (Pending → Processing → Success/Warning/Failed) as each
response comes back. This means:

- A slow/huge workbook only affects that one file's processing time, not the others.
- Server-side `max_execution_time` only needs to cover one workbook, not ten.
- If one file fails or times out, the rest of the queue still processes.

---

## 5. Step-by-step deployment

1. Upload the whole repository (or just the `profitability/` folder, renamed if you
   want a different URL path) to your hosting account via FTP, SFTP, or the cPanel
   File Manager's "Upload" + "Extract" (zip it first for faster transfer).
2. Confirm `profitability/vendor/` made it over intact (it's ~8.5MB — some FTP clients
   choke on many small files; a zip-upload-then-extract-on-server approach is more
   reliable than uploading thousands of individual vendor files over FTP).
3. Set folder permissions per Section 2 above.
4. Apply the php.ini recommendations from Section 3 (control panel, `.user.ini`, or ask
   your host).
5. Visit `https://yourdomain.com/profitability/index.php` in a browser. First run
   auto-creates `storage/data/app.sqlite` and seeds the account-mapping rules — you'll
   see an empty "Belum ada data" state with a link to the upload page.
6. Go to **Upload Laporan**, select one or more `.xlsx` files, click **Process All**.
7. Once at least one file succeeds, go back to **Profitability Analysis** to see the
   outlet summary, click into an outlet for the full dashboard.

No build step, no `npm install`, no asset compilation. `assets/js/vendor/chart.umd.min.js`
is Chart.js, vendored locally so the dashboard charts work with **zero external network
calls** at runtime (nothing is fetched from a CDN).

---

## 6. Known limitations (carried over from the technical build)

- **Legacy binary `.xls`** (pre-2007 Excel format) is not accepted — only `.xlsx`
  (OOXML/ZIP). PhpSpreadsheet can read `.xls` too, but that path was not ported/tested
  in this phase; uploading a `.xls` file is rejected with a clear error rather than
  silently mis-parsed.
- SQLite is a single file with no built-in concurrent-write scaling. For a handful of
  staff uploading files occasionally, this is fine (SQLite handles many concurrent
  *readers* fine, and writes are short transactions). If you outgrow this (many outlets,
  many simultaneous uploads), migrate to MySQL/MariaDB — the PDO layer in `lib/Db.php`
  is the only place that would need a new driver + equivalent schema.
- The debug validation report generator (`src/scripts/validationReport.ts` in the
  Next.js version) was not ported to PHP in this phase — use the **Data Quality** page's
  "Lihat detail" per-upload debug log (sheet detection reasoning, rows scanned/skipped,
  mapping success/failure) for now, which covers the same underlying data.
