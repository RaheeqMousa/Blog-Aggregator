import { db } from "..";
import { feeds } from "../../../src/schema";
import { eq, sql } from "drizzle-orm";

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

export async function getFeedByUrl(url: string){
	try{
		const [result]= await db.
			select().
			from(feeds)
			.where(eq(feeds.url, url))
		
		return result;
	}catch(error){
		console.log("Feeds retrieve was not successful");
		throw error;
	}
}

export async function markFeedFetched(feedId: string){
	const now=new Date();
	
	await db.update(feeds)
		.set({
			lastFetchedAt:now,
			updatedAt:now
		}).where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch(){
	const [feed]= await db
		.select()
		.from(feeds)
		.orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
		.limit(1);
	
	return feed;
}
