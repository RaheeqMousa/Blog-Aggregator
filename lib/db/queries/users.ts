import { db } from "..";
import { users } from "../../../src/schema";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
	const [result] = await db.insert(users).values({ name: name }).returning();
	return result;
}

export async function getUserByName(name:string){
	const [result]= await db.select()
	.from(users)
	.where(eq(users.name, name));
	return result;
}

export async function getUserById(id:string){
	const [result]= await db.select()
	.from(users)
	.where(eq(users.id, id));
	return result;
}

export async function deleteAllUsers(){
	try{
		await db.delete(users);
		console.log("All users are deleted successfully");
	}catch(error){
		console.log("Users deletion was not successful");
		throw error;
	}
}

export async function getUsers(){
	try{
		return await db.select().from(users);
	}catch(error){
		console.log("Users retrieve was not successful");
		throw error;
	}
}

