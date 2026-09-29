import { db } from "..";
import { posts, feeds, feedFollows } from "../../../src/schema";
import { eq, sql, desc,asc } from "drizzle-orm";

export async function createPost(title:string, url: string, description: string, publishedAt: Date, feedId:string){
	const [post]= await db
		.insert(posts)
		.values({
		title,
		url,
		description,
		publishedAt,
		feedId,
		})
		.onConflictDoNothing()
		.returning();
		
	return post;
}

export async function getPostsForUser(userId:string, limit:number, offset: number,
  sort: "newest" | "oldest"){
	return await db
		.select({
			id: posts.id,
			createdAt: posts.createdAt,
			updatedAt: posts.updatedAt,
			title: posts.title,
			url: posts.url,
			description: posts.description,
			publishedAt: posts.publishedAt,
			feedId: posts.feedId,
		})
		.from(posts)
		.innerJoin(feeds, eq(posts.feedId, feeds.id))
		.innerJoin(feedFollows, eq(feeds.id, feedFollows.feedId))
		.where(eq(feedFollows.userId, userId))
		.orderBy(desc(posts.publishedAt))
		.orderBy(
			sort === "newest"? desc(posts.publishedAt): asc(posts.publishedAt)
		)
		.limit(limit)
		.offset(offset);
}
