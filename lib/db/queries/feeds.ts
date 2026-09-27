import { db } from "..";
import { feeds } from "../../../src/schema";
import { eq } from "drizzle-orm";

export async function createFeed(name:string, url: string, userId:string){
	const [result] = await db.insert(feeds).values({ name, url, userId }).returning();
	return result;

}

export async function getFeeds(){
	try{
		return await db.select().from(feeds);
	}catch(error){
		console.log("Feeds retrieve was not successful");
		throw error;
	}
}
