-- Annual financial statements (a Reference source, ticket #179): the Ministry of Finance's yearly bulk files of company statements on
-- data.gov.ro, one row per CUI per fiscal year. Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004).
-- Amounts are integer bani (the file's whole lei x 100), like every money number in the graph. A blank cell is NULL, never 0: a blank
-- average-employee count in particular is "not reported". Nothing here is ever added to awarded value (ADR 0014); the entity page reads it
-- beside the awards, as context.
DROP SCHEMA IF EXISTS financials CASCADE;
CREATE SCHEMA financials;

-- One row per file the statements were read from (a bulk file of one kind, one fiscal year, one release): what each figure cites.
CREATE TABLE financials.source_file (
    id            integer PRIMARY KEY,
    fiscal_year   integer NOT NULL,
    kind          text NOT NULL,              -- bl-bs-sl (long and short balance sheets), uu (the abbreviated format), ir (IFRS reporters)
    revision      text NOT NULL CHECK (revision IN ('FIRST', 'REVISED')),  -- FIRST: the year's first release; REVISED: MF's re-published `actualizat` file
    file_name     text NOT NULL,              -- as MF names it, e.g. WEB_BL_BS_SL_AN2024.txt
    archive_path  text NOT NULL,              -- relative to the archive root
    dataset_url   text,                       -- MF's dataset page on data.gov.ro
    dataset_title text,                       -- as the portal gives it (source data)
    resource_url  text,                       -- the file's own download URL
    license       text,
    published     date,                       -- the day MF published this file (the resource's last_modified)
    fetched_at    timestamptz NOT NULL,
    row_count     integer NOT NULL
);

-- One row per CUI per fiscal year. `revision` is the release the row comes from: REVISED when MF's `actualizat` file for that year
-- holds the CUI, else FIRST. (The newest year held has only a first release: the page says it may still be revised.)
CREATE TABLE financials.statement (
    cui              text NOT NULL,           -- normalised: no `RO`, no leading zeros (an entity's key)
    fiscal_year      integer NOT NULL,
    revision         text NOT NULL CHECK (revision IN ('FIRST', 'REVISED')),
    turnover_bani    bigint,                  -- I13, cifra de afaceri neta
    profit_loss_bani bigint,                  -- net profit (I18) minus net loss (I19); negative is a loss; NULL when both are blank
    debts_bani       bigint,                  -- I7, datorii
    equity_bani      bigint,                  -- I10, capitaluri - total (negative when the company owes more than it owns)
    employees        integer,                 -- I20, numar mediu de salariati; NULL when blank (never 0)
    source_file_id   integer NOT NULL REFERENCES financials.source_file(id),
    PRIMARY KEY (cui, fiscal_year)
);
