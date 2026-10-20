import { Database } from "bun:sqlite";


const files = {
    constructor(
   	this.db = new Database("./data/uwurl.sqlite", { create: true });
    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
	    id         TEXT PRIMARY KEY,
		password   TEXT NOT NULL,      -- hash, ne heslo
        name       TEXT NOT NULL,      -- původní jméno souboru
	    size       INTEGER NOT NULL,
        created_at INTEGER NOT NULL
	  )
    `);
    )
}
