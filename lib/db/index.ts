import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../src/schema";
import { readConfig } from "../../src/config";

const config = readConfig();
const conn = postgres(config.dbUrl);
export const db = drizzle(conn, { schema });
