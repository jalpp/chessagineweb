import { Db } from "mongodb";
import client from "./db";

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db("chessagine");
}
