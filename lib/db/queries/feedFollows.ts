import { db } from "..";
import { feedFollows, feeds, users } from "../../../src/schema";
import { and, eq } from "drizzle-orm";

export async function createFeedFollow(
	userId: string,
	feedId: string
){
	const [newFeedFollow]= await db.insert(feedFollows)
	.values({
		userId,
		feedId
	})
	.returning();
	
	const [result]= await db.select(
	{
		id: feedFollows.id,
		createdAt: feedFollows.createdAt,
		updatedAt: feedFollows.updatedAt,
		userId: feedFollows.userId,
		feedId: feedFollows.feedId,
		userName: users.name,
		feedName: feeds.name,
	})
	.from(feedFollows)
	.innerJoin(users, eq(feedFollows.userId, users.id))
	.innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
	.where();
	
	return result;
}

export async function getFeedFollowsForUser(userId: string){
	return await db
    	.select({
		id: feedFollows.id,
      		createdAt: feedFollows.createdAt,
      		updatedAt: feedFollows.updatedAt,
      		userId: feedFollows.userId,
      		feedId: feedFollows.feedId,
      		userName: users.name,
      		feedName: feeds.name,
    	})
	.from(feedFollows)
    	.innerJoin(users, eq(feedFollows.userId, users.id))
    	.innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    	.where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(userId: string, feedUrl: string){
	const [feed]= await db.select({id: feeds.id})
	.from(feeds)
	.where(eq(feeds.url, feedUrl));
	
	if(!feed)
		return
		
	await db.delete(feedFollows)
		.where(
			and(
			eq(feedFollows.userId, userId),
			eq(feedFollows.feedId, feed.id),
			)
		);
}
